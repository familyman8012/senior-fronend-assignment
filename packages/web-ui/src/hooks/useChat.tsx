import { useCallback, useEffect } from 'react';
import { useChatStore, detectContentType } from '@/store/chatStore';
import { ContentType } from '@/types/chat';
import { OpenAIService } from '@/services/openaiService';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { OfflineQueue } from '@/utils/offlineQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface QueuedMessage {
  content: string;
  timestamp: number;
}

const messageQueue = new OfflineQueue<QueuedMessage>('chatMessageQueue');

export function useChat() {
  const { isOnline } = useNetworkStatus();
  const {
    addMessage,
    updateMessage,
    appendToStreamingMessage,
    setLoading,
    setError,
    setStreamingId,
    messages,
    setAbortController,
    getAbortController,
  } = useChatStore();

  // 공통 스트리밍 처리 함수
  const handleStreaming = useCallback(async (
    apiMessages: ChatCompletionMessageParam[],
    assistantMessageId: string,
    onError?: (error: Error) => void
  ) => {
    setStreamingId(assistantMessageId);
    setLoading(true);

          try {
        const controller = new AbortController();
        setAbortController(controller);
        console.log('New AbortController created');

        await OpenAIService.createChatStream({
          messages: apiMessages,
          signal: controller.signal,
          onChunk: (chunk) => {
            appendToStreamingMessage(assistantMessageId, chunk);
          },
        onComplete: () => {
          updateMessage(assistantMessageId, { isStreaming: false });
          setStreamingId(null);
        },
        onError: (error) => {
          handleStreamError(error, assistantMessageId);
          onError?.(error);
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      handleMessageCleanup(assistantMessageId);
      if (error instanceof Error && onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
      setStreamingId(null);
      setAbortController(null);
    }
  }, [appendToStreamingMessage, updateMessage, setLoading, setStreamingId, setError, setAbortController, getAbortController]);

  // 스트리밍 에러 처리 공통 함수
  const handleStreamError = useCallback((error: Error, messageId: string) => {
    setError(error.message);
    handleMessageCleanup(messageId);
    setStreamingId(null);
  }, [setError, setStreamingId]);

  // 빈 메시지 정리 공통 함수
  const handleMessageCleanup = useCallback((messageId: string) => {
    const message = useChatStore.getState().messages.find(m => m.id === messageId);
    if (message && !message.content) {
      useChatStore.getState().deleteMessage(messageId);
    } else if (message) {
      updateMessage(messageId, { isStreaming: false });
    }
  }, [updateMessage]);

  // Assistant 메시지 생성 공통 함수
  const createAssistantMessage = useCallback((contentType: ContentType) => {
    const assistantMessage = {
      role: 'assistant' as const,
      content: '',
      isStreaming: true,
      contentType,
    };
    
    addMessage(assistantMessage);
    
    const addedMessages = useChatStore.getState().messages;
    const actualAssistantMessage = addedMessages[addedMessages.length - 1];
    return actualAssistantMessage?.id;
  }, [addMessage]);

  const sendMessage = useCallback(async (content: string) => {
    setError(null);
    
    const userMessage = {
      role: 'user' as const,
      content,
    };
    addMessage(userMessage);

    if (!isOnline) {
      messageQueue.add({
        content,
        timestamp: Date.now(),
      });
      
      setError('오프라인 상태입니다. 온라인 상태가 되면 메시지가 자동으로 전송됩니다.');
      return;
    }

    const contentType = detectContentType(content) as ContentType;
    const assistantMessageId = createAssistantMessage(contentType);
    
    if (!assistantMessageId) {
      setError('메시지 생성에 실패했습니다.');
      return;
    }
    
    const currentMessages = useChatStore.getState().messages;
    const apiMessages: ChatCompletionMessageParam[] = [
      ...currentMessages.slice(0, -1).map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      userMessage,
    ];

    await handleStreaming(apiMessages, assistantMessageId);
  }, [addMessage, isOnline, setError, createAssistantMessage, handleStreaming]);

  const cancelStream = useCallback(() => {
    const controller = getAbortController();
    console.log('cancelStream called, abortController:', controller);
    if (controller) {
      controller.abort();
      setAbortController(null);
      
      const streamingId = useChatStore.getState().currentStreamingId;
      console.log('currentStreamingId:', streamingId);
      
      if (streamingId) {
        handleMessageCleanup(streamingId);
        setStreamingId(null);
      }
      
      // Clear any error that might be related to cancellation
      setError(null);
    }
  }, [handleMessageCleanup, setStreamingId, setAbortController, getAbortController, setError]);

  const regenerateMessage = useCallback(async (messageId: string) => {
    console.log('regenerateMessage called for:', messageId);
    setError(null);

    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].role !== 'assistant') {
      setError('재생성할 메시지를 찾을 수 없습니다.');
      return;
    }

    useChatStore.getState().truncateMessagesFrom(messageId);

    if (!isOnline) {
      setError('오프라인 상태에서는 메시지를 재생성할 수 없습니다.');
      return;
    }

    const contentType = messages[messageIndex].contentType || 'text';
    const assistantMessageId = createAssistantMessage(contentType);
    
    if (!assistantMessageId) {
      setError('메시지 생성에 실패했습니다.');
      return;
    }

    const apiMessages: ChatCompletionMessageParam[] = useChatStore.getState().messages
      .filter(msg => msg.id !== assistantMessageId)
      .map(msg => ({ role: msg.role, content: msg.content }));

    await handleStreaming(apiMessages, assistantMessageId);
  }, [messages, isOnline, setError, createAssistantMessage, handleStreaming]);

  const editAndResendMessage = useCallback(async (messageId: string, newContent: string) => {
    console.log('editAndResendMessage called for:', messageId);
    setError(null);

    useChatStore.getState().editMessage(messageId, newContent);

    if (!isOnline) {
      setError('오프라인 상태에서는 메시지를 수정하여 다시 보낼 수 없습니다.');
      return;
    }

    const contentType = detectContentType(newContent) as ContentType;
    const assistantMessageId = createAssistantMessage(contentType);
    
    if (!assistantMessageId) {
      setError('메시지 생성에 실패했습니다.');
      return;
    }
    
    const apiMessages: ChatCompletionMessageParam[] = useChatStore.getState().messages
      .filter(msg => msg.id !== assistantMessageId)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

    await handleStreaming(apiMessages, assistantMessageId);
  }, [isOnline, setError, createAssistantMessage, handleStreaming]);

  // Set up offline queue processor
  useEffect(() => {
    messageQueue.setProcessor(async (queuedMessage) => {
      await sendMessage(queuedMessage.content);
    });

    messageQueue.setErrorHandler((error, item) => {
      setError(`메시지 전송 실패 (${item.data.content.slice(0, 20)}...): ${error.message}`);
    });

    messageQueue.startAutoProcess();
  }, [sendMessage, setError]);

  // Process queue when coming online
  useEffect(() => {
    if (isOnline) {
      messageQueue.processQueue();
    }
  }, [isOnline]);

  return {
    sendMessage,
    cancelStream,
    regenerateMessage,
    editAndResendMessage,
  };
}
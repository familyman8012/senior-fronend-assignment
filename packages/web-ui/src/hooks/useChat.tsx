import { useCallback, useRef, useEffect } from 'react';
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const { isOnline } = useNetworkStatus();
  const {
    addMessage,
    updateMessage,
    appendToStreamingMessage,
    setLoading,
    setError,
    setStreamingId,
    messages,
  } = useChatStore();

  const sendMessage = useCallback(async (content: string) => {
    // Clear any previous errors
    setError(null);
    
    // Add user message
    const userMessage = {
      role: 'user' as const,
      content,
    };
    addMessage(userMessage);

    // Check if offline
    if (!isOnline) {
      // Add to offline queue
      messageQueue.add({
        content,
        timestamp: Date.now(),
      });
      
      setError('오프라인 상태입니다. 온라인 상태가 되면 메시지가 자동으로 전송됩니다.');
      return;
    }

    // Create assistant message placeholder with unique ID
    const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const assistantMessage = {
      role: 'assistant' as const,
      content: '',
      isStreaming: true,
      contentType: detectContentType(content) as ContentType,
    };
    
    // Get current messages state for API call
    const currentMessages = useChatStore.getState().messages;
    
    // Add the assistant message and get its ID from the store
    addMessage(assistantMessage);
    
    // Get the actual ID of the just-added message
    const addedMessages = useChatStore.getState().messages;
    const actualAssistantMessage = addedMessages[addedMessages.length - 1];
    const actualAssistantId = actualAssistantMessage?.id;
    
    if (!actualAssistantId) {
      setError('메시지 생성에 실패했습니다.');
      return;
    }
    
    setStreamingId(actualAssistantId);
    setLoading(true);

    try {
      abortControllerRef.current = new AbortController();
      
      // Prepare messages for API
      const apiMessages: ChatCompletionMessageParam[] = [
        ...currentMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        userMessage,
      ];

      await OpenAIService.createChatStream({
        messages: apiMessages,
        signal: abortControllerRef.current.signal,
        onChunk: (chunk) => {
          appendToStreamingMessage(actualAssistantId, chunk);
        },
        onComplete: () => {
          updateMessage(actualAssistantId, { isStreaming: false });
          setStreamingId(null);
        },
        onError: (error) => {
          setError(error.message);
          // Remove empty assistant message on error
          const message = useChatStore.getState().messages.find(m => m.id === actualAssistantId);
          if (message && !message.content) {
            useChatStore.getState().deleteMessage(actualAssistantId);
          }
        },
      });
      
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || '메시지 전송 중 오류가 발생했습니다.');
      }
      
      // Remove the empty assistant message on error
      const message = useChatStore.getState().messages.find(m => m.id === actualAssistantId);
      if (message && !message.content) {
        useChatStore.getState().deleteMessage(actualAssistantId);
      }
    } finally {
      setLoading(false);
      setStreamingId(null);
      abortControllerRef.current = null;
    }
  }, [addMessage, updateMessage, appendToStreamingMessage, setLoading, setError, setStreamingId]);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const regenerateLastMessage = useCallback(async (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex > 0) {
      const previousMessage = messages[messageIndex - 1];
      if (previousMessage.role === 'user') {
        // Delete the assistant message
        useChatStore.getState().deleteMessage(messageId);
        // Resend the user message
        await sendMessage(previousMessage.content);
      }
    }
  }, [messages, sendMessage]);

  // Set up offline queue processor
  useEffect(() => {
    messageQueue.setProcessor(async (queuedMessage) => {
      await sendMessage(queuedMessage.content);
    });

    messageQueue.setErrorHandler((error, item) => {
      setError(`메시지 전송 실패 (${item.data.content.slice(0, 20)}...): ${error.message}`);
    });

    // Start auto-processing when online
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
    regenerateLastMessage,
  };
}
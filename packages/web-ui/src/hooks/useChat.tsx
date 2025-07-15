import { useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';
import { ContentType } from '@/types/chat';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useChatMutations } from '@/hooks/useChatMutations';
import { parseError } from '@/utils/errorHandling';

export function useChat() {
  const { isOnline } = useNetworkStatus();
  const {
    addMessage,
    setError,
    messages,
    currentChatId,
    createNewChat,
    saveCurrentChat,
  } = useChatStore();
  
  const { messageMutation, cancelStream } = useChatMutations();

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

  // Unified message handler for send, regenerate, and editAndResend
  const handleMessage = useCallback(async (
    type: 'send' | 'regenerate' | 'editAndResend',
    params: { content?: string; messageId?: string; newContent?: string }
  ) => {
    if (!isOnline) {
      // 오프라인 상태에서는 아무 작업도 수행하지 않고, OfflineIndicator가 표시되도록 합니다.
      return;
    }
    setError(null);

    // Type-specific preprocessing
    if (type === 'send') {
      // Create new chat if this is the first message
      if (!currentChatId && messages.length === 0) {
        createNewChat();
      }
      
      const userMessage = {
        role: 'user' as const,
        content: params.content!,
      };
      addMessage(userMessage);
      
      // Auto-save after adding user message
      setTimeout(() => saveCurrentChat(), 100);
    } else if (type === 'regenerate') {
      const messageIndex = messages.findIndex(msg => msg.id === params.messageId);
      if (messageIndex === -1 || messages[messageIndex].role !== 'assistant') {
        setError('재생성할 메시지를 찾을 수 없습니다.');
        return;
      }
      useChatStore.getState().truncateMessagesFrom(params.messageId!);
    } else if (type === 'editAndResend') {
      useChatStore.getState().editMessage(params.messageId!, params.newContent!);
    }

    // Get content type from previous message for regenerate
    let contentType: ContentType = 'text';
    if (type === 'regenerate') {
      const messageIndex = messages.findIndex(msg => msg.id === params.messageId);
      contentType = messages[messageIndex].contentType || 'text';
    }

    // Create assistant message
    const assistantMessageId = createAssistantMessage(contentType);
    if (!assistantMessageId) {
      setError('메시지 생성에 실패했습니다.');
      return;
    }

    // Execute mutation
    messageMutation.mutate(
      {
        type,
        content: params.content,
        messageId: params.messageId,
        newContent: params.newContent,
        contentType,
        assistantMessageId,
      },
      {
        onError: (error) => {
          const appError = parseError(error);
          setError(appError.message);
        },
        onSuccess: () => {
          // Auto-save after assistant message is complete
          setTimeout(() => saveCurrentChat(), 100);
        },
      }
    );
  }, [addMessage, isOnline, messages, setError, createAssistantMessage, messageMutation]);

  // Convenience methods that use the unified handler
  const sendMessage = useCallback((content: string) => {
    return handleMessage('send', { content });
  }, [handleMessage]);

  const regenerateMessage = useCallback((messageId: string) => {
    return handleMessage('regenerate', { messageId });
  }, [handleMessage]);

  const editAndResendMessage = useCallback((messageId: string, newContent: string) => {
    return handleMessage('editAndResend', { messageId, newContent });
  }, [handleMessage]);


  return {
    sendMessage,
    cancelStream,
    regenerateMessage,
    editAndResendMessage,
    // Mutation states
    isSending: messageMutation.isPending && messageMutation.variables?.type === 'send',
    isRegenerating: messageMutation.isPending && messageMutation.variables?.type === 'regenerate',
    isEditing: messageMutation.isPending && messageMutation.variables?.type === 'editAndResend',
    isStreaming: messageMutation.isPending,
  };
}
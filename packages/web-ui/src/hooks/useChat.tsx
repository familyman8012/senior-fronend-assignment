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
    setError(null);

    // Type-specific preprocessing
    if (type === 'send') {
      const userMessage = {
        role: 'user' as const,
        content: params.content!,
      };
      addMessage(userMessage);

      if (!isOnline) {
        setError('오프라인 상태입니다. 네트워크 연결을 확인해주세요.');
        return;
      }
    } else if (type === 'regenerate') {
      console.log('regenerateMessage called for:', params.messageId);
      const messageIndex = messages.findIndex(msg => msg.id === params.messageId);
      if (messageIndex === -1 || messages[messageIndex].role !== 'assistant') {
        setError('재생성할 메시지를 찾을 수 없습니다.');
        return;
      }
      useChatStore.getState().truncateMessagesFrom(params.messageId!);

      if (!isOnline) {
        setError('오프라인 상태에서는 메시지를 재생성할 수 없습니다.');
        return;
      }
    } else if (type === 'editAndResend') {
      console.log('editAndResendMessage called for:', params.messageId);
      useChatStore.getState().editMessage(params.messageId!, params.newContent!);

      if (!isOnline) {
        setError('오프라인 상태에서는 메시지를 수정하여 다시 보낼 수 없습니다.');
        return;
      }
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
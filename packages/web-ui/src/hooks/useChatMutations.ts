import { useMutation } from '@tanstack/react-query';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { OpenAIService } from '@/services/openaiService';
import { useChatStore } from '@/store/chatStore';
import { ContentType } from '@/types/chat';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

type MessageMutationType = 'send' | 'regenerate' | 'editAndResend';

interface MessageMutationVariables {
  type: MessageMutationType;
  content?: string; // for send
  messageId?: string; // for regenerate and editAndResend
  newContent?: string; // for editAndResend
  contentType: ContentType;
  assistantMessageId: string;
}

export function useChatMutations() {
  const { isOnline } = useNetworkStatus();
  const {
    appendToStreamingMessage,
    updateMessage,
    setStreamingId,
    setAbortController,
    getAbortController,
    saveCurrentChat,
  } = useChatStore();

  // Unified mutation for all message operations
  const messageMutation = useMutation({
    mutationFn: async ({ type, assistantMessageId }: MessageMutationVariables) => {
      if (!isOnline) {
        const errorMessages = {
          send: '오프라인 상태입니다. 네트워크 연결을 확인해주세요.',
          regenerate: '오프라인 상태에서는 메시지를 재생성할 수 없습니다.',
          editAndResend: '오프라인 상태에서는 메시지를 수정하여 다시 보낼 수 없습니다.',
        };
        throw new Error(errorMessages[type]);
      }

      const controller = new AbortController();
      setAbortController(controller);
      setStreamingId(assistantMessageId);

      const currentMessages = useChatStore.getState().messages;
      const apiMessages: ChatCompletionMessageParam[] = (
        type === 'send'
          ? currentMessages.slice(0, -1)
          : currentMessages.filter(msg => msg.id !== assistantMessageId)
      ).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      await OpenAIService.createChatStream({
        messages: apiMessages,
        signal: controller.signal,
        onChunk: (chunk, contentType) => {
          appendToStreamingMessage(assistantMessageId, chunk);
          
          // Update contentType when first detected
          if (contentType) {
            const message = useChatStore.getState().messages.find(m => m.id === assistantMessageId);
            if (message && message.contentType === 'text') {
              updateMessage(assistantMessageId, { contentType: contentType as ContentType });
            }
          }
        },
        onComplete: () => {
          updateMessage(assistantMessageId, { isStreaming: false });
          setStreamingId(null);
          // Auto-save after streaming completes
          setTimeout(() => saveCurrentChat(), 100);
        },
        onError: (error) => {
          throw error;
        },
      });
    },
    onError: (error, variables) => {
      const message = useChatStore.getState().messages.find(m => m.id === variables.assistantMessageId);
      if (message && !message.content) {
        useChatStore.getState().deleteMessage(variables.assistantMessageId);
      } else if (message) {
        updateMessage(variables.assistantMessageId, { isStreaming: false });
      }
      setStreamingId(null);
      setAbortController(null);
    },
    onSettled: () => {
      setAbortController(null);
    },
  });

  // Cancel stream function
  const cancelStream = () => {
    const controller = getAbortController();
    if (controller) {
      controller.abort();
      setAbortController(null);
      
      const streamingId = useChatStore.getState().currentStreamingId;
      if (streamingId) {
        const message = useChatStore.getState().messages.find(m => m.id === streamingId);
        if (message && !message.content) {
          useChatStore.getState().deleteMessage(streamingId);
        } else if (message) {
          updateMessage(streamingId, { isStreaming: false });
        }
        setStreamingId(null);
      }
    }
  };

  return {
    messageMutation,
    cancelStream,
  };
}
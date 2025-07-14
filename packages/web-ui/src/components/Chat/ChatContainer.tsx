import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageList } from '@/components/Message/MessageList';
import { MessageInput } from '@/components/Message/MessageInput';
import { useChat } from '@/hooks/useChat';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingIndicator } from '@/components/LoadingIndicator';

export default function ChatContainer() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, error, isLoading, currentStreamingId } = useChatStore();
  const { sendMessage, cancelStream, regenerateLastMessage } = useChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (content: string) => {
    await sendMessage(content);
  }, [sendMessage]);

  const handleRegenerate = useCallback(() => {
    const lastAssistantMessage = [...messages].reverse().find(msg => msg.role === 'assistant');
    if (lastAssistantMessage) {
      regenerateLastMessage(lastAssistantMessage.id);
    }
  }, [messages, regenerateLastMessage]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Cancel streaming with Escape key
    if (e.key === 'Escape' && currentStreamingId) {
      cancelStream();
    }
  }, [currentStreamingId, cancelStream]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg
              className="w-16 h-16 mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h3 className="text-lg font-medium mb-2">채팅을 시작해보세요</h3>
            <p className="text-sm text-center max-w-md">
              메시지에 "markdown", "html", "json" 키워드를 포함하면
              <br />
              해당 형식으로 응답을 받을 수 있습니다.
            </p>
          </div>
        ) : (
          <>
            <MessageList messages={messages} />
            <div ref={scrollRef} />
          </>
        )}
        
        {error && (
          <div className="sticky bottom-0 mt-4">
            <ErrorAlert message={error} onRetry={handleRegenerate} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-4">
        {currentStreamingId && (
          <div className="flex items-center justify-center mb-2">
            <LoadingIndicator />
            <span className="ml-2 text-sm text-gray-500">
              응답 생성 중... (ESC로 취소)
            </span>
          </div>
        )}
        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={!!currentStreamingId}
        />
      </div>
    </div>
  );
}
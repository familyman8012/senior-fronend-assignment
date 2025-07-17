import { useEffect, useCallback, memo } from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageList } from '@/components/Message/MessageList';
import { MessageInput } from '@/components/Message/MessageInput';
import { useChat } from '@/hooks/useChat';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const ChatContainer = memo(function ChatContainer() {
  const { messages, error, currentStreamingId } = useChatStore();
  const { sendMessage, cancelStream, regenerateMessage, editAndResendMessage, isStreaming } = useChat();
  const { isOnline } = useNetworkStatus();

  // 새 메시지가 도착하면 맨 아래로 자동 스크롤
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(async (content: string) => {
    await sendMessage(content);
  }, [sendMessage]);

  const handleRetry = useCallback(() => {
    // 마지막 메시지가 사용자의 메시지인지 확인 (전송 실패 시나리오)
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage?.role === 'user') {
      // 중복을 피하기 위해 재시도 플래그와 함께 마지막 사용자 메시지 다시 보내기
      sendMessage(lastMessage.content, true);
    } else if (lastMessage?.role === 'assistant') {
      // 마지막 어시스턴트 메시지 재성성
      regenerateMessage(lastMessage.id);
    }
  }, [messages, regenerateMessage, sendMessage]);


  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 어시스턴트 메시지에 내용이 있는 경우에만 Escape 키로 스트리밍 취소
    if (e.key === 'Escape' && currentStreamingId) {
      // 스트리밍 메시지가 존재하고 내용이 있는지 확인
      const streamingMessage = useChatStore.getState().messages.find(msg => msg.id === currentStreamingId);
      if (streamingMessage && streamingMessage.role === 'assistant' && streamingMessage.content.trim().length > 0) {
        cancelStream();
      }
    }
  }, [currentStreamingId, cancelStream]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col min-h-full max-w-5xl mx-auto">
      <div className="flex-1 px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-14rem)] text-gray-500">
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
          <MessageList 
            messages={messages} 
            onRegenerate={regenerateMessage}
            onEditAndResend={editAndResendMessage}
          />
        )}
        
        {error && (
          <div className="sticky bottom-0 mt-4">            
            <ErrorAlert message={error} onRetry={handleRetry} />
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-gray-200 bg-white px-4 py-4">
        {!isOnline && (
          <div className="flex items-center justify-center mb-2 text-red-600">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">
              오프라인 모드: 저장된 대화만 볼 수 있습니다
            </span>
          </div>
        )}
        {currentStreamingId && (
          <div className="flex items-center justify-center mb-2">
            <LoadingIndicator />
            <span className="ml-2 text-sm text-gray-500">
              응답 생성 중...
              {messages.find(msg => msg.id === currentStreamingId && msg.role === 'assistant' && msg.content.trim().length > 0) && ' (ESC로 취소)'}
            </span>
          </div>
        )}
        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isStreaming}
          disabled={!!currentStreamingId || !isOnline}
        />
      </div>
    </div>
  );
});

export default ChatContainer;
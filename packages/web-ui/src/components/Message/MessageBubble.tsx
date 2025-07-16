import { memo, useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { ContentRenderer } from '@/components/ContentRenderer/ContentRenderer';
import clsx from 'clsx';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: (messageId: string) => void;
  onEditAndResend?: (messageId: string, newContent: string) => void;
}

export const MessageBubble = memo(({ message, onRegenerate, onEditAndResend }: MessageBubbleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  const handleEdit = useCallback(() => {
    if (isUser && !isStreaming) {
      setIsEditing(true);
      setEditContent(message.content);
    }
  }, [isUser, isStreaming, message.content]);

  const handleSaveEdit = useCallback(() => {
    if (editContent.trim() !== message.content && onEditAndResend) {
      onEditAndResend(message.id, editContent.trim());
    }
    setIsEditing(false);
  }, [editContent, onEditAndResend, message.content, message.id]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent(message.content);
  }, [message.content]);

  const handleRegenerate = useCallback(() => {
    if (!isUser && !isStreaming && onRegenerate) {
      onRegenerate(message.id);
    }
  }, [isUser, isStreaming, onRegenerate, message.id]);

  const formattedTime = new Date(message.timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={clsx(
        'flex items-start gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={clsx(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-medium',
          isUser ? 'bg-blue-600' : 'bg-gray-600'
        )}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      <div className="flex-1 max-w-[70%]">
        <div
          className={clsx(
            'rounded-lg px-4 py-3',
            isUser ? 'bg-chat-user ml-auto text-gray-900' : 'bg-chat-ai text-gray-900',
            isStreaming && 'animate-fade-in'
          )}
        >
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border border-gray-300 bg-white text-gray-900 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                autoFocus
                placeholder='메시지를 입력하세요.'
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  저장
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              <ContentRenderer
                content={message.content}
                contentType={isUser ? 'text' : message.contentType || 'text'}
              />
              {isStreaming && <span className="inline-block w-2 h-4 bg-gray-400 animate-typing" />}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span>{formattedTime}</span>
          {!isStreaming && (
            <>
              {isUser && (
                <button
                  onClick={handleEdit}
                  className="hover:text-gray-700"
                  aria-label="메시지 편집"
                >
                  편집
                </button>
              )}
              {!isUser && (
                <button
                  onClick={handleRegenerate}
                  className="hover:text-gray-700"
                  aria-label="응답 재생성"
                >
                  재생성
                </button>
              )}            
            </>
          )}
        </div>
      </div>
    </div>
  );
});
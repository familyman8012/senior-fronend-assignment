import { useState, useCallback, useRef, KeyboardEvent, memo } from 'react';
import clsx from 'clsx';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  onAbort?: () => void;
}

function MessageInput({ onSendMessage, isLoading, disabled, onAbort }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      
      // 텍스트 영역 높이 재설정
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [message, disabled, onSendMessage]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleInput = useCallback(() => {
    if (textareaRef.current) {
      // 텍스트 영역 자동 크기 조절
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="w-full"
    >
      <div className="flex items-end gap-2 p-3 backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 rounded-2xl border border-white/50 dark:border-white/10 shadow-lg focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 focus-within:border-transparent transition-all">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
            disabled={disabled}
            className={clsx(
              'w-full px-1 py-0 resize-none border-0',
              'bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none focus:ring-0',
              'disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-500',
              'min-h-[24px] max-h-[120px]'
            )}
            rows={1}
            aria-label="메시지 입력"
          />
          
          {message.length > 0 && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {message.length} 자
            </div>
          )}
        </div>

        <button
          type={isLoading ? "button" : "submit"}
          onClick={isLoading ? onAbort : undefined}
          disabled={!isLoading && (!message.trim() || disabled)}
          className={clsx(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400',
            isLoading
              ? 'bg-gray-900 dark:bg-gray-700 text-white hover:bg-gray-800 dark:hover:bg-gray-600'
              : !message.trim() || disabled
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-gray-900 dark:bg-gray-700 text-white hover:bg-gray-800 dark:hover:bg-gray-600 hover:scale-110'
          )}
          aria-label={isLoading ? "스트리밍 중지" : "메시지 전송"}
        >
          {isLoading ? (
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <rect x="4" y="4" width="8" height="8" rx="0.5" />
            </svg>
          ) : (
            <svg 
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M5 12h14m-7-7l7 7-7 7" 
              />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}

export default memo(MessageInput);
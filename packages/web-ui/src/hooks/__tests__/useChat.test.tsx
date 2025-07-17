import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChat } from '../useChat';
import { useChatStore } from '@/store/chatStore';
import { OpenAIService } from '@/services/openaiService';
import React from 'react';

// 모의 설정
vi.mock('@/store/chatStore');
vi.mock('@/services/openaiService');
vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isOnline: true }),
}));

// 테스트 래퍼
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useChat hook', () => {
  const mockChatStore = {
    addMessage: vi.fn(),
    setError: vi.fn(),
    updateMessage: vi.fn(),
    deleteMessage: vi.fn(),
    truncateMessagesFrom: vi.fn(),
    editMessage: vi.fn(),
    appendToStreamingMessage: vi.fn(),
    setStreamingId: vi.fn(),
    setAbortController: vi.fn(),
    getAbortController: vi.fn(),
    createNewChat: vi.fn(),
    saveCurrentChat: vi.fn(),
    messages: [],
    currentChatId: null,
    currentStreamingId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // useChatStore 모의
    vi.mocked(useChatStore).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockChatStore);
      }
      return mockChatStore;
    });
    
    // useChatStore.getState 모의
    vi.mocked(useChatStore).getState = vi.fn(() => mockChatStore);
  });

  describe('sendMessage', () => {
    it('메시지를 전송하고 스트리밍 응답을 받아야 함', async () => {
      const mockStreamResponse = vi.fn();
      vi.mocked(OpenAIService.createChatStream).mockImplementation(async ({ onChunk }) => {
        onChunk?.('안녕', 'text');
        onChunk?.('하세요!', 'text');
        return Promise.resolve();
      });

      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.sendMessage('안녕하세요');
      });

      // 사용자 메시지 추가 확인
      expect(mockChatStore.addMessage).toHaveBeenCalledWith({
        role: 'user',
        content: '안녕하세요',
      });

      // AI 메시지 추가 확인
      expect(mockChatStore.addMessage).toHaveBeenCalledWith({
        role: 'assistant',
        content: '',
        isStreaming: true,
        contentType: 'text',
      });

      // 스트리밍 메시지 업데이트 확인
      await waitFor(() => {
        expect(mockChatStore.appendToStreamingMessage).toHaveBeenCalled();
      });
    });

    it('첫 메시지일 때 새 채팅을 생성해야 함', async () => {
      mockChatStore.messages = [];
      mockChatStore.currentChatId = null;

      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.sendMessage('첫 메시지');
      });

      expect(mockChatStore.createNewChat).toHaveBeenCalled();
    });

    it('재시도 시 사용자 메시지를 다시 추가하지 않아야 함', async () => {
      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.sendMessage('재시도 메시지', true);
      });

      // 재시도일 때는 사용자 메시지를 추가하지 않음
      expect(mockChatStore.addMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ role: 'user' })
      );
    });

    it('오프라인일 때 메시지를 전송하지 않아야 함', async () => {
      vi.mock('@/hooks/useNetworkStatus', () => ({
        useNetworkStatus: () => ({ isOnline: false }),
      }));

      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.sendMessage('오프라인 메시지');
      });

      expect(mockChatStore.addMessage).not.toHaveBeenCalled();
      expect(OpenAIService.createChatStream).not.toHaveBeenCalled();
    });
  });

  describe('regenerateMessage', () => {
    it('어시스턴트 메시지를 재생성해야 함', async () => {
      mockChatStore.messages = [
        { id: 'msg-1', role: 'user', content: '질문', contentType: 'text' },
        { id: 'msg-2', role: 'assistant', content: '답변', contentType: 'markdown' },
      ];

      vi.mocked(OpenAIService.createChatStream).mockResolvedValue(undefined);

      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.regenerateMessage('msg-2');
      });

      // 메시지 truncate 확인
      expect(mockChatStore.truncateMessagesFrom).toHaveBeenCalledWith('msg-2');

      // 새 어시스턴트 메시지 생성 확인
      expect(mockChatStore.addMessage).toHaveBeenCalledWith({
        role: 'assistant',
        content: '',
        isStreaming: true,
        contentType: 'markdown', // 이전 메시지의 contentType 유지
      });
    });

    it('존재하지 않는 메시지 재생성 시 오류를 설정해야 함', async () => {
      mockChatStore.messages = [];

      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.regenerateMessage('non-existent');
      });

      expect(mockChatStore.setError).toHaveBeenCalled();
    });
  });

  describe('editAndResendMessage', () => {
    it('메시지를 수정하고 다시 전송해야 함', async () => {
      mockChatStore.messages = [
        { id: 'msg-1', role: 'user', content: '원본 메시지', contentType: 'text' },
      ];

      vi.mocked(OpenAIService.createChatStream).mockResolvedValue(undefined);

      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.editAndResendMessage('msg-1', '수정된 메시지');
      });

      // 메시지 수정 확인
      expect(mockChatStore.editMessage).toHaveBeenCalledWith('msg-1', '수정된 메시지');

      // 새 어시스턴트 메시지 생성 확인
      expect(mockChatStore.addMessage).toHaveBeenCalledWith({
        role: 'assistant',
        content: '',
        isStreaming: true,
        contentType: 'text',
      });
    });
  });

  describe('cancelStream', () => {
    it('스트리밍을 취소해야 함', () => {
      const mockAbortController = {
        abort: vi.fn(),
      };
      
      mockChatStore.getAbortController = vi.fn(() => mockAbortController);
      mockChatStore.currentStreamingId = 'stream-1';
      mockChatStore.messages = [
        { id: 'stream-1', role: 'assistant', content: '일부 내용', contentType: 'text' },
      ];

      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      act(() => {
        result.current.cancelStream();
      });

      expect(mockAbortController.abort).toHaveBeenCalled();
    });

    it('내용이 없는 스트리밍 메시지는 삭제해야 함', async () => {
      const mockAbortController = {
        abort: vi.fn(),
      };
      
      mockChatStore.getAbortController = vi.fn(() => mockAbortController);
      mockChatStore.currentStreamingId = 'stream-1';
      mockChatStore.messages = [
        { id: 'stream-1', role: 'assistant', content: '', contentType: 'text' },
      ];

      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      act(() => {
        result.current.cancelStream();
      });

      await waitFor(() => {
        expect(mockChatStore.deleteMessage).toHaveBeenCalledWith('stream-1');
      }, { timeout: 200 });
    });
  });

  describe('상태 플래그', () => {
    it('각 작업 유형에 대한 상태를 올바르게 반영해야 함', async () => {
      vi.mocked(OpenAIService.createChatStream).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      // 초기 상태
      expect(result.current.isSending).toBe(false);
      expect(result.current.isRegenerating).toBe(false);
      expect(result.current.isEditing).toBe(false);
      expect(result.current.isStreaming).toBe(false);

      // 메시지 전송
      act(() => {
        result.current.sendMessage('테스트');
      });

      await waitFor(() => {
        expect(result.current.isSending).toBe(true);
        expect(result.current.isStreaming).toBe(true);
      });

      // 완료 대기
      await waitFor(() => {
        expect(result.current.isSending).toBe(false);
        expect(result.current.isStreaming).toBe(false);
      }, { timeout: 200 });
    });
  });

  describe('오류 처리', () => {
    it('스트리밍 중 오류 발생 시 처리해야 함', async () => {
      vi.mocked(OpenAIService.createChatStream).mockRejectedValue(
        new Error('네트워크 오류')
      );

      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.sendMessage('오류 테스트');
      });

      await waitFor(() => {
        expect(mockChatStore.setError).toHaveBeenCalled();
      });
    });

    it('빈 어시스턴트 메시지는 오류 시 삭제해야 함', async () => {
      // 빈 메시지 ID를 추적하기 위한 설정
      let assistantMessageId: string;
      mockChatStore.addMessage.mockImplementation((msg) => {
        if (msg.role === 'assistant') {
          assistantMessageId = 'assistant-msg-id';
          mockChatStore.messages.push({ ...msg, id: assistantMessageId });
        }
      });

      vi.mocked(OpenAIService.createChatStream).mockRejectedValue(
        new Error('스트리밍 오류')
      );

      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.sendMessage('오류 테스트');
      });

      await waitFor(() => {
        expect(mockChatStore.deleteMessage).toHaveBeenCalledWith('assistant-msg-id');
      });
    });
  });
});
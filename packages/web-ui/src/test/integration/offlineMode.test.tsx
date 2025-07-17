import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { mockNetworkStatus, mockLocalStorage } from '@/test/utils';

describe('오프라인 모드 통합 테스트', () => {
  beforeEach(() => {
    localStorage.clear();
    // 기본적으로 온라인 상태로 설정
    mockNetworkStatus(true);
  });

  it('오프라인 상태에서 인디케이터가 표시되어야 함', async () => {
    render(<App />);
    
    // 오프라인 상태로 변경
    mockNetworkStatus(false);
    
    await waitFor(() => {
      expect(screen.getByText('오프라인 모드: 저장된 대화만 볼 수 있습니다.')).toBeInTheDocument();
    });
  });

  it('오프라인 상태에서 메시지 전송이 비활성화되어야 함', async () => {
    mockNetworkStatus(false);
    render(<App />);
    
    const input = screen.getByPlaceholderText('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    const sendButton = screen.getByRole('button', { name: '메시지 전송' });
    
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('느린 연결 상태가 표시되어야 함', async () => {
    render(<App />);
    
    // 느린 연결 상태로 변경
    mockNetworkStatus(true, 'slow-2g');
    
    await waitFor(() => {
      expect(screen.getByText('느린 연결 (slow-2g)')).toBeInTheDocument();
    });
  });

  it('오프라인 상태에서도 저장된 채팅 히스토리에 접근할 수 있어야 함', async () => {
    // 채팅 세션 데이터 설정
    mockLocalStorage({
      chatSessions: [
        {
          id: 'session-1',
          title: '저장된 대화',
          messages: [
            { id: 'msg-1', role: 'user', content: '안녕하세요', contentType: 'text', timestamp: new Date() },
            { id: 'msg-2', role: 'assistant', content: 'AI 응답', contentType: 'text', timestamp: new Date() }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    const user = userEvent.setup();
    render(<App />);
    
    // 사이드바 열기
    const menuButton = screen.getByRole('button', { name: 'Open sidebar' });
    await user.click(menuButton);
    
    // 저장된 대화 확인
    expect(screen.getByText('저장된 대화')).toBeInTheDocument();
    
    // 오프라인 상태로 변경
    mockNetworkStatus(false);
    
    // 저장된 대화 클릭
    await user.click(screen.getByText('저장된 대화'));
    
    // 메시지들이 표시되어야 함
    expect(screen.getByText('안녕하세요')).toBeInTheDocument();
    expect(screen.getByText('AI 응답')).toBeInTheDocument();
  });

  it('온라인 상태로 복귀 시 기능이 다시 활성화되어야 함', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // 오프라인 상태로 시작
    mockNetworkStatus(false);
    
    await waitFor(() => {
      expect(screen.getByText('오프라인 모드: 저장된 대화만 볼 수 있습니다.')).toBeInTheDocument();
    });
    
    const input = screen.getByPlaceholderText('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    expect(input).toBeDisabled();
    
    // 온라인 상태로 복귀
    mockNetworkStatus(true);
    
    await waitFor(() => {
      expect(screen.queryByText('오프라인 모드: 저장된 대화만 볼 수 있습니다.')).not.toBeInTheDocument();
    });
    
    expect(input).not.toBeDisabled();
    
    // 메시지 전송 가능
    await user.type(input, '온라인 테스트');
    await user.keyboard('{Enter}');
    
    expect(screen.getByText('온라인 테스트')).toBeInTheDocument();
  });

  it('오프라인 상태에서 채팅 세션 내보내기가 동작해야 함', async () => {
    // 채팅 세션 데이터 설정
    mockLocalStorage({
      chatSessions: [
        {
          id: 'export-test',
          title: '내보내기 테스트',
          messages: [
            { id: 'msg-1', role: 'user', content: '테스트', contentType: 'text', timestamp: new Date() }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    const user = userEvent.setup();
    render(<App />);
    
    // 오프라인 상태로 설정
    mockNetworkStatus(false);
    
    // 사이드바 열기
    const menuButton = screen.getByRole('button', { name: 'Open sidebar' });
    await user.click(menuButton);
    
    // 세션 호버하여 액션 버튼 표시
    const session = screen.getByText('내보내기 테스트').closest('[role="button"]');
    await user.hover(session!);
    
    // JSON 내보내기 버튼 클릭
    const exportJsonButton = screen.getByRole('button', { name: 'JSON으로 내보내기' });
    await user.click(exportJsonButton);
    
    // URL.createObjectURL이 호출되었는지 확인
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('오프라인 상태에서 검색 기능이 동작해야 함', async () => {
    // 여러 채팅 세션 데이터 설정
    mockLocalStorage({
      chatSessions: [
        {
          id: 'session-1',
          title: '첫 번째 대화',
          messages: [
            { id: 'msg-1', role: 'user', content: 'React 관련 질문', contentType: 'text', timestamp: new Date() }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'session-2',
          title: '두 번째 대화',
          messages: [
            { id: 'msg-2', role: 'user', content: 'TypeScript 질문', contentType: 'text', timestamp: new Date() }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    const user = userEvent.setup();
    render(<App />);
    
    // 오프라인 상태로 설정
    mockNetworkStatus(false);
    
    // 사이드바 열기
    const menuButton = screen.getByRole('button', { name: 'Open sidebar' });
    await user.click(menuButton);
    
    // 검색 입력
    const searchInput = screen.getByPlaceholderText(/대화 검색/);
    await user.type(searchInput, 'React');
    
    // React가 포함된 세션만 표시되어야 함
    await waitFor(() => {
      expect(screen.getByText('첫 번째 대화')).toBeInTheDocument();
      expect(screen.queryByText('두 번째 대화')).not.toBeInTheDocument();
    });
  });

  it('연결 상태 변경이 실시간으로 반영되어야 함', async () => {
    render(<App />);
    
    // 초기 온라인 상태
    expect(screen.queryByText(/오프라인 모드/)).not.toBeInTheDocument();
    
    // 오프라인으로 변경
    mockNetworkStatus(false);
    
    await waitFor(() => {
      expect(screen.getByText('오프라인 모드: 저장된 대화만 볼 수 있습니다.')).toBeInTheDocument();
    });
    
    // 느린 연결로 변경
    mockNetworkStatus(true, '2g');
    
    await waitFor(() => {
      expect(screen.getByText('느린 연결 (2g)')).toBeInTheDocument();
    });
    
    // 정상 연결로 복귀
    mockNetworkStatus(true, '4g');
    
    await waitFor(() => {
      expect(screen.queryByText(/느린 연결/)).not.toBeInTheDocument();
      expect(screen.queryByText(/오프라인 모드/)).not.toBeInTheDocument();
    });
  });

  it('오프라인 상태에서 새 채팅 시작이 비활성화되어야 함', async () => {
    const user = userEvent.setup();
    mockNetworkStatus(false);
    render(<App />);
    
    // 사이드바 열기
    const menuButton = screen.getByRole('button', { name: 'Open sidebar' });
    await user.click(menuButton);
    
    // 새 채팅 버튼이 있지만 클릭해도 동작하지 않아야 함
    const newChatButton = screen.getByText('새 채팅').closest('button');
    expect(newChatButton).toBeInTheDocument();
    
    // 현재 메시지가 없는 상태
    expect(screen.getByText('채팅을 시작해보세요')).toBeInTheDocument();
    
    await user.click(newChatButton!);
    
    // 여전히 빈 상태여야 함
    expect(screen.getByText('채팅을 시작해보세요')).toBeInTheDocument();
  });
});
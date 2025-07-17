import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import ChatContainer from '@/components/Chat/ChatContainer';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('채팅 스트리밍 통합 테스트', () => {
  beforeEach(() => {
    // localStorage 초기화
    localStorage.clear();
  });

  it('사용자 메시지 전송 후 AI 응답이 스트리밍으로 표시되어야 함', async () => {
    const user = userEvent.setup();
    render(<ChatContainer />);

    // 메시지 입력
    const input = screen.getByPlaceholderText('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    await user.type(input, '안녕하세요');

    // 전송
    await user.keyboard('{Enter}');

    // 사용자 메시지가 표시되어야 함
    expect(screen.getByText('안녕하세요')).toBeInTheDocument();

    // AI 응답이 스트리밍으로 표시되어야 함
    await waitFor(() => {
      expect(screen.getByText(/안녕하세요! 테스트 응답입니다/)).toBeInTheDocument();
    }, { timeout: 3000 });

    // 스트리밍 인디케이터가 사라져야 함
    await waitFor(() => {
      expect(screen.queryByText('응답 생성 중...')).not.toBeInTheDocument();
    });
  });

  it('스트리밍 중 ESC 키로 취소할 수 있어야 함', async () => {
    // 느린 스트리밍 설정
    server.use(
      http.post('http://localhost:3001/v1/chat/completions', async () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const content = '매우 긴 응답입니다...';
            
            for (let i = 0; i < content.length; i++) {
              const chunk = {
                id: 'test-stream',
                object: 'chat.completion.chunk',
                created: Date.now(),
                model: 'gpt-3.5-turbo',
                choices: [{
                  index: 0,
                  delta: { content: content[i] },
                  finish_reason: null
                }]
              };
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              await new Promise(resolve => setTimeout(resolve, 200)); // 느린 스트리밍
            }
          }
        });

        return new HttpResponse(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
          },
        });
      })
    );

    const user = userEvent.setup();
    render(<ChatContainer />);

    // 메시지 전송
    const input = screen.getByPlaceholderText('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    await user.type(input, '테스트');
    await user.keyboard('{Enter}');

    // 스트리밍 시작 대기
    await waitFor(() => {
      expect(screen.getByText('응답 생성 중...')).toBeInTheDocument();
    });

    // 일부 내용이 표시되기를 기다림
    await waitFor(() => {
      expect(screen.getByText(/매우/)).toBeInTheDocument();
    });

    // ESC 키로 취소
    await user.keyboard('{Escape}');

    // 스트리밍이 중단되어야 함
    await waitFor(() => {
      expect(screen.queryByText('응답 생성 중...')).not.toBeInTheDocument();
    });
  });

  it('다양한 콘텐츠 타입이 올바르게 렌더링되어야 함', async () => {
    const user = userEvent.setup();
    render(<ChatContainer />);

    // Markdown 테스트
    const input = screen.getByPlaceholderText('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    await user.type(input, 'markdown 예시를 보여주세요');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('마크다운 예시');
    });

    // HTML 테스트
    await user.clear(input);
    await user.type(input, 'html 태그 예시를 주세요');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('HTML 예시')).toBeInTheDocument();
    });

    // JSON 테스트
    await user.clear(input);
    await user.type(input, 'json 형태로 데이터를 주세요');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('JSON 데이터')).toBeInTheDocument();
    });
  });

  it('메시지 편집 및 재전송이 동작해야 함', async () => {
    const user = userEvent.setup();
    render(<ChatContainer />);

    // 첫 메시지 전송
    const input = screen.getByPlaceholderText('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    await user.type(input, '첫 번째 메시지');
    await user.keyboard('{Enter}');

    // AI 응답 대기
    await waitFor(() => {
      expect(screen.getByText(/테스트 응답/)).toBeInTheDocument();
    });

    // 메시지 편집
    const editButton = screen.getByRole('button', { name: '메시지 편집' });
    await user.click(editButton);

    const editTextarea = screen.getByDisplayValue('첫 번째 메시지');
    await user.clear(editTextarea);
    await user.type(editTextarea, '수정된 메시지');

    await user.click(screen.getByText('보내기'));

    // 수정된 메시지가 표시되어야 함
    expect(screen.getByText('수정된 메시지')).toBeInTheDocument();
    expect(screen.queryByText('첫 번째 메시지')).not.toBeInTheDocument();
  });

  it('AI 응답 재생성이 동작해야 함', async () => {
    const user = userEvent.setup();
    render(<ChatContainer />);

    // 메시지 전송
    const input = screen.getByPlaceholderText('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    await user.type(input, '재생성 테스트');
    await user.keyboard('{Enter}');

    // AI 응답 대기
    await waitFor(() => {
      expect(screen.getByText(/테스트 응답/)).toBeInTheDocument();
    });

    // 응답 재생성
    const regenerateButton = screen.getByRole('button', { name: '응답 재생성' });
    await user.click(regenerateButton);

    // 새로운 응답이 생성되어야 함
    await waitFor(() => {
      expect(screen.getByText('응답 생성 중...')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText('응답 생성 중...')).not.toBeInTheDocument();
    });
  });

  it('빠른 연속 메시지 전송이 처리되어야 함', async () => {
    const user = userEvent.setup();
    render(<ChatContainer />);

    const input = screen.getByPlaceholderText('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');

    // 연속으로 메시지 전송
    await user.type(input, '첫 번째');
    await user.keyboard('{Enter}');
    
    await user.type(input, '두 번째');
    await user.keyboard('{Enter}');
    
    await user.type(input, '세 번째');
    await user.keyboard('{Enter}');

    // 모든 메시지가 표시되어야 함
    expect(screen.getByText('첫 번째')).toBeInTheDocument();
    expect(screen.getByText('두 번째')).toBeInTheDocument();
    expect(screen.getByText('세 번째')).toBeInTheDocument();

    // 각 메시지에 대한 응답이 표시되어야 함
    await waitFor(() => {
      const responses = screen.getAllByText(/테스트 응답/);
      expect(responses).toHaveLength(3);
    });
  });

  it('스크롤 동작이 올바르게 작동해야 함', async () => {
    const user = userEvent.setup();
    render(<ChatContainer />);

    const input = screen.getByPlaceholderText('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');

    // 여러 메시지 전송하여 스크롤 필요하도록 만들기
    for (let i = 0; i < 10; i++) {
      await user.type(input, `메시지 ${i + 1}`);
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText(`메시지 ${i + 1}`)).toBeInTheDocument();
      });
    }

    // scrollIntoView가 호출되었는지 확인
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('메시지 문자 수가 표시되어야 함', async () => {
    const user = userEvent.setup();
    render(<ChatContainer />);

    const input = screen.getByPlaceholderText('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    await user.type(input, '테스트 메시지');

    // 문자 수 표시 확인
    expect(screen.getByText('8 자')).toBeInTheDocument();
  });

  it('네트워크 오류 시 재시도 기능이 동작해야 함', async () => {
    let attemptCount = 0;
    
    server.use(
      http.post('http://localhost:3001/v1/chat/completions', () => {
        attemptCount++;
        if (attemptCount === 1) {
          return HttpResponse.error();
        }
        return HttpResponse.json({
          id: 'success',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-3.5-turbo',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: '재시도 성공!',
            },
            finish_reason: 'stop'
          }]
        });
      })
    );

    const user = userEvent.setup();
    render(<ChatContainer />);

    // 메시지 전송
    const input = screen.getByPlaceholderText('메시지를 입력하세요... (Shift+Enter로 줄바꿈)');
    await user.type(input, '네트워크 테스트');
    await user.keyboard('{Enter}');

    // 오류 메시지 대기
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // 재시도 버튼 클릭
    const retryButton = screen.getByText('다시 시도');
    await user.click(retryButton);

    // 재시도 성공
    await waitFor(() => {
      expect(screen.getByText('재시도 성공!')).toBeInTheDocument();
    });
  });
});
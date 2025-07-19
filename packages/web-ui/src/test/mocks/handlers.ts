import { http, HttpResponse } from 'msw';

export const handlers = [
  // 채팅 완료 엔드포인트
  http.post('http://localhost:3001/v1/chat/completions', async ({ request }) => {
    const body = await request.json() as any;
    const isStream = body.stream === true;

    if (isStream) {
      // 스트리밍 응답
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const lastMessage = body.messages[body.messages.length - 1];
          const content = lastMessage.content.toLowerCase();
          let responseContent = '';
          let contentType = 'text';
          
          // 디버깅 로그 제거

          // 콘텐츠 타입 감지
          if (content.includes('markdown') || content.includes('md')) {
            contentType = 'markdown';
            responseContent = '# 마크다운 예시\n\n- 체크리스트\n- [x] 완료된 항목\n\n**굵은 글씨**';
            // console.log('✓ Markdown condition triggered');
          } else if (content.includes('html')) {
            contentType = 'html';
            responseContent = '<div><h3>HTML 예시</h3><button>클릭 버튼</button></div>';
            // console.log('✓ HTML condition triggered');
          } else if (content.includes('json')) {
            contentType = 'json';
            responseContent = '{\n  "user": {\n    "name": "김철수",\n    "age": 30\n  }\n}';
            // console.log('✓ JSON condition triggered');
          } else {
            responseContent = '안녕하세요! 테스트 응답입니다.';
            // console.log('✗ Default condition triggered');
          }
          
          // console.log('Final responseContent:', responseContent);
          // console.log('Final contentType:', contentType);

          // 스트리밍 시작 전 지연 추가
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // 스트리밍 시뮬레이션
          for (let i = 0; i < responseContent.length; i++) {
            const chunk = {
              id: 'test-stream-id',
              object: 'chat.completion.chunk',
              created: Date.now(),
              model: 'gpt-3.5-turbo',
              choices: [{
                index: 0,
                delta: {
                  content: responseContent[i],
                  ...(i === 0 ? { contentType } : {})
                },
                finish_reason: null
              }]
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            await new Promise(resolve => setTimeout(resolve, 10)); // 10ms 딜레이로 감소
          }

          // 종료 신호
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      return new HttpResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // 일반 응답
      const content = body.messages[0].content.toLowerCase();
      let responseContent = '안녕하세요! 테스트 응답입니다.';
      let contentType = 'text';

      if (content.includes('markdown')) {
        contentType = 'markdown';
        responseContent = '# 마크다운 예시\n\n- 리스트 항목';
      } else if (content.includes('html')) {
        contentType = 'html';
        responseContent = '<div>HTML 예시</div>';
      } else if (content.includes('json')) {
        contentType = 'json';
        responseContent = '{"test": true}';
      }

      return HttpResponse.json({
        id: 'test-completion-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: responseContent,
            contentType
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      });
    }
  }),

  // 네트워크 오류 시뮬레이션을 위한 핸들러
  http.post('http://localhost:3001/v1/chat/completions/error', () => {
    return HttpResponse.error();
  }),

  // 429 에러 (Rate Limit) 시뮬레이션
  http.post('http://localhost:3001/v1/chat/completions/rate-limit', () => {
    return new HttpResponse(null, {
      status: 429,
      statusText: 'Too Many Requests',
    });
  }),
];
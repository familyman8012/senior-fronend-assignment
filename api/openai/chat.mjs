// OpenAI Chat Completions Mock API
// 직접 구현 - 서버리스 최적화
// Node.js Functions에서 Request/Response API 사용

// openai-api-mock과 동일한 Content Samples
const CONTENT_SAMPLES = {
  markdown: [
    "# 마크다운 예시\n\n- 체크리스트\n- [x] 완료된 항목\n- [ ] 미완료 항목\n\n```javascript\nconst code = 'example';\nconsole.log('Hello World');\n```\n\n**굵은 글씨**와 *기울임*도 지원합니다.",
    "## 테이블 예시\n\n| 이름 | 나이 | 직업 |\n|------|------|------|\n| 김철수 | 30 | 개발자 |\n| 이영희 | 28 | 디자이너 |\n| 박민수 | 35 | 기획자 |\n\n> 인용문도 지원됩니다.",
    "### 할 일 목록\n\n1. [x] 프로젝트 설정\n2. [ ] UI 구현\n3. [ ] 테스트 작성\n4. [ ] 배포 준비\n\n---\n\n```python\ndef hello():\n    return \"Hello, World!\"\n```"
  ],
  html: [
    "<div><h3>HTML 예시</h3><button style='padding:8px 16px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;'>클릭 버튼</button><br><br><ul><li>목록 1</li><li>목록 2</li></ul><p><strong>굵은 글씨</strong>와 <em>기울임</em></p></div>",
    "<form style='border:1px solid #ddd; padding:16px; border-radius:8px;'><h4>사용자 정보 입력</h4><label>이름: <input type='text' placeholder='이름을 입력하세요' style='margin-left:8px; padding:4px;'></label><br><br><label>이메일: <input type='email' placeholder='email@example.com' style='margin-left:8px; padding:4px;'></label><br><br><button type='submit' style='background:#28a745; color:white; border:none; padding:8px 16px; border-radius:4px;'>전송</button></form>",
    "<div class='alim_box' style='background:#f8f9fa; padding:16px; border-left:4px solid #007bff;'><h4 style='margin:0 0 8px 0; color:#007bff;'>알림</h4><p style='margin:0;'>이것은 HTML 스타일이 적용된 알림 박스입니다.</p><ul style='margin:8px 0 0 0;'><li>항목 A</li><li>항목 B</li></ul></div>"
  ],
  json: [
    '{\n  "user": {\n    "name": "김철수",\n    "age": 30,\n    "skills": ["React", "TypeScript", "Node.js"],\n    "isActive": true\n  },\n  "timestamp": "2024-01-15T09:30:00Z",\n  "status": "success"\n}',
    '{\n  "products": [\n    {\n      "id": 1,\n      "name": "노트북",\n      "price": 1200000,\n      "category": "전자제품"\n    },\n    {\n      "id": 2,\n      "name": "마우스",\n      "price": 50000,\n      "category": "주변기기"\n    }\n  ],\n  "total": 1250000,\n  "currency": "KRW"\n}',
    '{\n  "response": {\n    "data": {\n      "users": [\n        {"id": 1, "name": "Alice", "role": "admin"},\n        {"id": 2, "name": "Bob", "role": "user"}\n      ]\n    },\n    "meta": {\n      "page": 1,\n      "limit": 10,\n      "total": 2\n    }\n  }\n}'
  ],
  text: [
    "안녕하세요! 일반 텍스트 응답입니다. 마크다운이나 HTML 태그가 포함되지 않은 순수 텍스트 메시지입니다.",
    "이것은 평범한 대화형 응답입니다. 사용자와의 자연스러운 대화를 위한 텍스트 형태의 메시지입니다.",
    "AI 어시스턴트가 제공하는 일반적인 텍스트 답변입니다. 특별한 포맷팅 없이 읽기 쉬운 형태로 정보를 전달합니다."
  ]
};

// 간단한 랜덤 선택 함수 (faker.js 대신)
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Content type 감지 함수 (openai-api-mock과 동일)
function detectContentType(messages) {
  const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
  
  if (lastMessage.includes('markdown') || lastMessage.includes('md')) {
    return 'markdown';
  }
  if (lastMessage.includes('html')) {
    return 'html';
  }
  if (lastMessage.includes('json')) {
    return 'json';
  }
  return 'text';
}

// Content sample 반환 함수 (openai-api-mock과 동일)
function getContentSample(contentType) {
  const samples = CONTENT_SAMPLES[contentType] || CONTENT_SAMPLES.text;
  return getRandomElement(samples);
}

// OpenAI API 형식의 응답 생성
function createOpenAIResponse(content, streaming = false) {
  const baseResponse = {
    id: `chatcmpl-${Math.random().toString(36).substr(2, 9)}`,
    object: streaming ? 'chat.completion.chunk' : 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-3.5-turbo',
    choices: [{
      index: 0,
      finish_reason: streaming ? null : 'stop'
    }]
  };

  if (streaming) {
    baseResponse.choices[0].delta = { content };
  } else {
    baseResponse.choices[0].message = {
      role: 'assistant',
      content
    };
  }

  return baseResponse;
}

// POST /api/openai/chat (프론트에선 /v1/chat/completions로 rewrite)
export default async function handler(request) {
  console.log('🚀 Mock API Handler called');
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const { stream, messages } = body;
    
    console.log(`📝 Processing ${messages?.length || 0} messages, streaming: ${stream}`);
    
    // Content type 감지 (openai-api-mock과 동일한 방식)
    const contentType = detectContentType(messages);
    console.log(`🎭 Detected content type: ${contentType}`);
    
    // Mock 응답 생성 (openai-api-mock과 동일한 샘플 사용)
    const mockContent = getContentSample(contentType);
    
    if (stream) {
      // 스트리밍 응답
      const streamContent = new ReadableStream({
        async start(controller) {
          try {
            // 응답을 청크로 나누어 스트리밍
            const chunks = mockContent.match(/.{1,10}/g) || [mockContent];
            
            for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i];
              const response = createOpenAIResponse(chunk, true);
              
              // 마지막 청크에는 finish_reason 추가
              if (i === chunks.length - 1) {
                response.choices[0].finish_reason = 'stop';
              }
              
              const data = `data: ${JSON.stringify(response)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
              
              // 실제 스트리밍 느낌을 위한 지연
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return new Response(streamContent, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // 일반 응답
      const response = createOpenAIResponse(mockContent, false);
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    console.error('❌ Mock API Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
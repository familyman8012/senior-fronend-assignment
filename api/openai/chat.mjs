// OpenAI Chat Completions Mock API - Complete Implementation
// Vercel Serverless 환경에 최적화된 전체 기능 구현

// Content Samples (openai-api-mock과 동일)
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

// Stream states storage (서버리스 환경에서는 메모리에 저장)
const streamStates = new Map();

// 유틸리티 함수들
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateId() {
  return Math.random().toString(36).substr(2, 30);
}

// Content type 감지 (openai-api-mock과 동일)
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

// Content sample 반환
function getContentSample(contentType) {
  const samples = CONTENT_SAMPLES[contentType] || CONTENT_SAMPLES.text;
  return getRandomElement(samples);
}

// 토큰 계산 (대략적인 계산)
function calculateTokens(text) {
  return Math.floor(text.length / 4);
}

// Stream cleanup
function cleanupStream(streamId) {
  if (streamId && streamStates.has(streamId)) {
    streamStates.delete(streamId);
  }
}

// OpenAI 응답 생성 (전체 기능 포함)
function createChatResponse(content, contentType, streaming = false, streamId = null, isFirst = false, isLast = false) {
  const id = streamId || `chatcmpl-${generateId()}`;
  const created = Math.floor(Date.now() / 1000);
  
  const baseResponse = {
    id,
    object: streaming ? 'chat.completion.chunk' : 'chat.completion',
    created,
    model: 'gpt-3.5-turbo-0125',
    system_fingerprint: null,
    choices: [{
      index: 0,
      logprobs: null,
      finish_reason: null
    }]
  };

  if (streaming) {
    // 스트리밍 응답
    baseResponse.choices[0].delta = {
      content: content || ''
    };
    
    // 첫 번째 청크에는 role 추가
    if (isFirst) {
      baseResponse.choices[0].delta.role = 'assistant';
      baseResponse.choices[0].delta.contentType = contentType;
    }
    
    // 마지막 청크
    if (isLast) {
      baseResponse.choices[0].finish_reason = 'stop';
      baseResponse.choices[0].delta.contentType = contentType;
    }
  } else {
    // 일반 응답
    baseResponse.choices[0].message = {
      role: 'assistant',
      content,
      contentType
    };
    baseResponse.choices[0].finish_reason = 'stop';
    baseResponse.usage = {
      prompt_tokens: 57,
      completion_tokens: calculateTokens(content),
      total_tokens: 57 + calculateTokens(content)
    };
  }

  return baseResponse;
}

// 스트리밍 처리 함수
async function handleStreaming(req, res, content, contentType, options = {}) {
  const streamId = `chatcmpl-${generateId()}`;
  let isAborted = false;
  
  // Stream state 초기화
  streamStates.set(streamId, {
    content,
    contentType,
    index: 0,
    created: Date.now()
  });

  // Abort 처리 (req.on('close') 사용)
  if (req && req.on) {
    req.on('close', () => {
      isAborted = true;
      cleanupStream(streamId);
    });
  }

  // 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    // 첫 번째 청크 (role과 contentType 포함)
    const firstChunk = createChatResponse('', contentType, true, streamId, true, false);
    res.write(`data: ${JSON.stringify(firstChunk)}\n\n`);

    // Character-by-character 스트리밍
    for (let i = 0; i < content.length; i++) {
      if (isAborted) break;

      const char = content[i];
      const chunk = createChatResponse(char, contentType, true, streamId, false, false);
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);

      // 자연스러운 스트리밍을 위한 지연
      const delay = options.latency || (char === ' ' ? 10 : 20);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (!isAborted) {
      // 마지막 청크 (finish_reason 포함)
      const lastChunk = createChatResponse('', contentType, true, streamId, false, true);
      res.write(`data: ${JSON.stringify(lastChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
    }
  } finally {
    cleanupStream(streamId);
    res.end();
  }
}

// 메인 핸들러
export default async function handler(req, res) {
  console.log('🚀 Mock Chat API Handler called');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const body = req.body;
    const { model, messages, stream, temperature, max_tokens, tools, functions } = body;
    
    // Request validation
    if (!model || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: {
          message: 'Invalid request. Missing required fields.',
          type: 'invalid_request_error',
          code: 'missing_required_fields'
        }
      });
    }

    console.log(`📝 Processing ${messages.length} messages, streaming: ${stream}`);
    
    // Error simulation (5% 확률)
    const includeErrors = process.env.MOCK_INCLUDE_ERRORS === 'true';
    if (includeErrors && Math.random() < 0.05) {
      return res.status(429).json({
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded'
        }
      });
    }

    // Function/Tool calling 지원
    if (tools || functions) {
      const toolResponse = {
        id: `chatcmpl-${generateId()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        system_fingerprint: null,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: tools ? [{
              id: `call_${generateId()}`,
              type: 'function',
              function: {
                name: tools[0].function.name,
                arguments: '{}'
              }
            }] : null,
            function_call: functions ? {
              name: functions[0].name,
              arguments: '{}'
            } : null
          },
          logprobs: null,
          finish_reason: 'tool_calls'
        }],
        usage: {
          prompt_tokens: 57,
          completion_tokens: 17,
          total_tokens: 74
        }
      };
      return res.json(toolResponse);
    }

    // Content type 감지
    const contentType = detectContentType(messages);
    console.log(`🎭 Detected content type: ${contentType}`);
    
    // Mock content 가져오기
    const mockContent = getContentSample(contentType);
    
    // Latency simulation
    const latency = parseInt(process.env.MOCK_LATENCY || '0');
    if (latency > 0) {
      await new Promise(resolve => setTimeout(resolve, latency));
    }
    
    if (stream) {
      // 스트리밍 응답
      await handleStreaming(req, res, mockContent, contentType, { latency: 20 });
    } else {
      // 일반 응답
      const response = createChatResponse(mockContent, contentType, false);
      res.json(response);
    }
  } catch (err) {
    console.error('❌ Mock API Error:', err);
    res.status(500).json({
      error: {
        message: 'Internal server error',
        type: 'server_error',
        code: 'internal_error'
      }
    });
  }
}
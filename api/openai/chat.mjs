// OpenAI Chat Completions Mock API
// 직접 구현 - 서버리스 최적화
// Node.js Functions에서 Request/Response API 사용

// Content type 감지 함수
function detectContentType(message) {
  const content = message.toLowerCase();
  if (content.includes('markdown') || content.includes('md')) return 'markdown';
  if (content.includes('html')) return 'html';
  if (content.includes('json')) return 'json';
  return 'text';
}

// Mock 응답 생성 함수
function generateMockResponse(messages, contentType) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  
  const responses = {
    text: `안녕하세요! "${lastMessage}"에 대한 응답입니다. 이것은 Mock 응답입니다.`,
    markdown: `# Mock 응답\n\n**사용자 메시지**: ${lastMessage}\n\n## 응답 내용\n\n이것은 **Markdown** 형식의 Mock 응답입니다.\n\n- 목록 항목 1\n- 목록 항목 2\n- 목록 항목 3\n\n\`\`\`javascript\nconsole.log('Mock 응답입니다!');\n\`\`\``,
    html: `<div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px;"><h2 style="color: #333;">Mock HTML 응답</h2><p><strong>사용자 메시지:</strong> ${lastMessage}</p><p>이것은 <em>HTML 형식</em>의 Mock 응답입니다.</p><ul><li>스타일이 적용된 목록</li><li>인라인 CSS 포함</li></ul></div>`,
    json: JSON.stringify({
      response: "Mock JSON 응답",
      userMessage: lastMessage,
      data: {
        items: ["항목 1", "항목 2", "항목 3"],
        timestamp: new Date().toISOString(),
        mockType: "json"
      }
    }, null, 2)
  };
  
  return responses[contentType] || responses.text;
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
    
    // Content type 감지
    const lastMessage = messages?.[messages.length - 1];
    const contentType = detectContentType(lastMessage?.content || '');
    console.log(`🎭 Detected content type: ${contentType}`);
    
    // Mock 응답 생성
    const mockContent = generateMockResponse(messages, contentType);
    
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
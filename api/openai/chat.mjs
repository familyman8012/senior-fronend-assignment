import { getOpenAI, initializeMock } from './_init.mjs';

// Edge Runtime 사용
export const config = {
  runtime: 'edge',
};

// POST /api/openai/chat  (프론트에선 /v1/chat/completions 로 rewrite)
export default async function handler(request) {
  console.log('🚀 Edge API Handler called');
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    console.log('🔄 Initializing mock...');
    await initializeMock();
    console.log('✅ Mock initialization completed');
  } catch (mockError) {
    console.error('❌ Mock initialization failed:', mockError);
    return new Response(JSON.stringify({ 
      error: 'Mock initialization failed', 
      details: mockError instanceof Error ? mockError.message : String(mockError)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { stream, ...openaiBody } = body;
    
    const openai = getOpenAI();
    console.log('🤖 Using OpenAI client for API call');
    
    if (stream) {
      const streamResp = await openai.chat.completions.create({
        ...openaiBody,
        stream: true,
      });

      // Edge Functions에서 스트리밍
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamResp) {
              const data = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      const resp = await openai.chat.completions.create(openaiBody);
      return new Response(JSON.stringify(resp), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
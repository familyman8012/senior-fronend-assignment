import { openai, initializeMock } from './_init.mjs';

// POST /api/openai/chat  (프론트에선 /v1/chat/completions 로 rewrite)
export default async function handler(req, res) {
  console.log('🚀 API Handler called');
  
  if (req.method !== 'POST') return res.status(405).end();

  try {
    console.log('🔄 Initializing mock...');
    await initializeMock();
    console.log('✅ Mock initialization completed');
  } catch (mockError) {
    console.error('❌ Mock initialization failed:', mockError);
    return res.status(500).json({ 
      error: 'Mock initialization failed', 
      details: mockError instanceof Error ? mockError.message : String(mockError)
    });
  }

  const { stream, ...body } = req.body;

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const streamResp = await openai.chat.completions.create({
        ...body,
        stream: true,
      });

      for await (const chunk of streamResp) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const resp = await openai.chat.completions.create(body);
      res.json(resp);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
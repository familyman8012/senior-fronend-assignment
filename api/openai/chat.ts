import type { VercelRequest, VercelResponse } from '@vercel/node';
import { openai } from './_init';

// POST /api/openai/chat  (프론트에선 /v1/chat/completions 로 rewrite)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

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

      for await (const chunk of streamResp as any) {
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
    res.status(500).json({ error: (err as Error).message });
  }
}
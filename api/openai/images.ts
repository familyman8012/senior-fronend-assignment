import type { VercelRequest, VercelResponse } from '@vercel/node';
import { openai } from './_init';

// POST /api/openai/images  (프론트에선 /v1/images/generations 로 rewrite)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const resp = await openai.images.generate(req.body);
    res.json(resp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
}
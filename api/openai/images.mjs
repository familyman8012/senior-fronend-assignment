import { openai, initializeMock } from './_init.mjs';

// POST /api/openai/images  (프론트에선 /v1/images/generations 로 rewrite)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Mock 초기화
  await initializeMock();

  try {
    const resp = await openai.images.generate(req.body);
    res.json(resp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
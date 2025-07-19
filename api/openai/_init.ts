// api/openai/_init.ts
import { mockOpenAIResponse } from '../../packages/openai-api-mock/dist/index.js';
import OpenAI from 'openai';

// ❶ 한 번만 모킹 활성화
const mockCtrl = mockOpenAIResponse(true, {
  seed: 12345,
  latency: 400,
  logRequests: false,
});

export const openai = new OpenAI({ apiKey: 'test-key' });   // same fake key
export { mockCtrl };
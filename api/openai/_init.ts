// api/openai/_init.ts
import OpenAI from 'openai';

let mockCtrl: any = null;
let isInitialized = false;

export async function initializeMock() {
  if (!isInitialized) {
    try {
      const { mockOpenAIResponse } = await import('../../packages/openai-api-mock/dist/index.js');
      mockCtrl = mockOpenAIResponse(true, {
        seed: 12345,
        latency: 400,
        logRequests: false,
      });
      isInitialized = true;
      console.log('Mock initialized successfully');
    } catch (error) {
      console.error('Failed to initialize mock:', error);
    }
  }
  return mockCtrl;
}

export const openai = new OpenAI({ apiKey: 'test-key' });
export { mockCtrl };
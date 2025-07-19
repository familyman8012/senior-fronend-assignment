// api/openai/_init.mjs
import OpenAI from 'openai';

let mockCtrl = null;
let isInitialized = false;
let openai = null;

export async function initializeMock() {
  console.log('🔍 initializeMock called, isInitialized:', isInitialized);
  
  if (!isInitialized) {
    try {
      console.log('📦 Attempting to import mock module...');
      const mockModule = await import('../../packages/openai-api-mock/dist/index.js');
      console.log('📦 Mock module imported:', Object.keys(mockModule));
      
      const { mockOpenAIResponse } = mockModule;
      console.log('🎭 mockOpenAIResponse function:', typeof mockOpenAIResponse);
      
      mockCtrl = mockOpenAIResponse(true, {
        seed: 12345,
        latency: 400,
        logRequests: true, // 활성화
      });
      
      isInitialized = true;
      console.log('✅ Mock initialized successfully, mockCtrl:', mockCtrl);
      
      // Mock 초기화 후 OpenAI 클라이언트 생성
      openai = new OpenAI({ 
        apiKey: 'test-key',
        dangerouslyAllowBrowser: true
      });
      console.log('🤖 OpenAI client created after mock initialization');
      
    } catch (error) {
      console.error('❌ Failed to initialize mock:', error);
      throw error; // 에러를 다시 던져서 상위에서 처리
    }
  } else {
    console.log('♻️ Mock already initialized');
  }
  
  return mockCtrl;
}

export function getOpenAI() {
  if (!openai) {
    throw new Error('OpenAI client not initialized. Call initializeMock() first.');
  }
  return openai;
}

export { mockCtrl };
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
        includeErrors: false, // 에러 시뮬레이션 비활성화
        interceptorOptions: {
          verbose: true // interceptor 디버깅
        }
      });
      
      isInitialized = true;
      console.log('✅ Mock initialized successfully, mockCtrl:', mockCtrl);
      
      
    } catch (error) {
      console.error('❌ Failed to initialize mock:', error);
      throw error; // 에러를 다시 던져서 상위에서 처리
    }
  } else {
    console.log('♻️ Mock already initialized');
  }
  
  // Mock 초기화 후 항상 새로운 OpenAI 클라이언트 생성
  // 테스트: 다른 baseURL로 설정해서 mock이 작동하는지 확인
  openai = new OpenAI({ 
    apiKey: 'test-key',
    baseURL: 'https://api.openai.com/v1',  // 명시적으로 설정
    dangerouslyAllowBrowser: true
  });
  console.log('🤖 OpenAI client created with explicit baseURL');
  
  return mockCtrl;
}

export function getOpenAI() {
  if (!openai) {
    throw new Error('OpenAI client not initialized. Call initializeMock() first.');
  }
  return openai;
}

export { mockCtrl };
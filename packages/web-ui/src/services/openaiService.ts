import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionChunk } from 'openai/resources/chat/completions';

// Mock 초기화 상태
let mockInitialized = false;

// Mock 초기화 함수
async function initializeMockIfNeeded() {
  if (!mockInitialized) {
    try {
      // Dynamic import로 mock 라이브러리 로드 (타입 에러 우회)
      const mockModule = await import('../../../openai-api-mock/dist/index.js') as any;
      const { mockOpenAIResponse } = mockModule;
      
      // Mock 활성화
      mockOpenAIResponse(true, {
        seed: 12345,
        latency: 400,
        logRequests: true, // 디버깅을 위해 활성화
      });
      
      mockInitialized = true;
      console.log('✅ Mock initialized successfully on client');
      alert('✅ Mock 초기화 성공!');
    } catch (error) {
      console.error('❌ Failed to initialize mock:', error);
      alert(`❌ Mock 초기화 실패: ${error}`);
    }
  }
}

// OpenAI 클라이언트 구성 (mock 사용을 위해 기본 baseURL 사용)
const openai = new OpenAI({
  apiKey: 'test-key',
  dangerouslyAllowBrowser: true,
  maxRetries: 0,
});

export interface ChatStreamOptions {
  messages: ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  onChunk?: (chunk: string, contentType?: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

type DeltaWithContentType = ChatCompletionChunk.Choice.Delta & {
  contentType?: string;
};

export class OpenAIService {
  static async createChatStream({
    messages,
    model = 'gpt-3.5-turbo',
    temperature = 0.7,
    maxTokens = 1000,
    signal,
    onChunk,
    onError,
    onComplete,
  }: ChatStreamOptions): Promise<void> {
    try {
      // Mock 초기화
      await initializeMockIfNeeded();
      
      // 디버깅을 위한 로그 추가
      console.log('OpenAIService.createChatStream called:', {
        model,
        messagesCount: messages.length,
        timestamp: new Date().toISOString()
      });

      const stream = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }, { signal });

      console.log('OpenAI stream created successfully');

      let detectedContentType: string | undefined;
      
      for await (const chunk of stream) {
        // 먼저 중단 상태 확인
        if (signal?.aborted) {
          break;  // 예외를 던지는 대신 루프 종료
        }

        const content = chunk.choices[0]?.delta?.content || '';
        const contentType = (chunk.choices[0]?.delta as DeltaWithContentType)?.contentType;
        
        // contentType이 처음 감지되면 저장
        if (contentType && !detectedContentType) {
          detectedContentType = contentType;
        }
        
        // content가 있거나 contentType이 변경된 경우 콜백 호출
        if ((content || contentType) && onChunk) {
          onChunk(content, detectedContentType);
        }

        // 스트림이 끝났는지 확인
        if (chunk.choices[0]?.finish_reason === 'stop') {
          onComplete?.();
          break;
        }
      }
    } catch (error) {
      // 디버깅: 에러 상세 정보 출력
      console.error('OpenAI API Error:', error);
      alert(`OpenAI API 에러! ${error instanceof Error ? error.message : String(error)}`);
      
      // AbortError 포함 모든 에러를 캐치
      if (error instanceof Error && error.name === 'AbortError') {
        // 중단은 정상적인 플로우이므로 조용히 처리
        return;
      }
      
      // 다른 에러는 onError 콜백으로 전달
      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown error occurred'));
      } else {
        // onError가 없으면 에러를 다시 던짐
        throw error;
      }
    }
  }

  static async createChatCompletion(
    messages: ChatCompletionMessageParam[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const response = await openai.chat.completions.create({
      model: options?.model || 'gpt-3.5-turbo',
      messages,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 1000,
      stream: false,
    });

    return response.choices[0]?.message?.content || '';
  }
}
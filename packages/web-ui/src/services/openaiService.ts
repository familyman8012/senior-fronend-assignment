import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionChunk } from 'openai/resources/chat/completions';

// OpenAI 클라이언트 구성
// 개발 환경에서는 localhost:3001에서 모의 서버가 실행될 것으로 예상합니다.
// 임시 테스트: 절대 경로 사용
const defaultBaseURL = typeof window !== 'undefined' 
  ? `${window.location.origin}/v1` 
  : '/v1';
const baseURL = import.meta.env.VITE_OPENAI_API_BASE ?? defaultBaseURL;

console.log('OpenAI baseURL:', baseURL);

const openai = new OpenAI({
  apiKey:  'test-key',
  baseURL,
  dangerouslyAllowBrowser: true,
  maxRetries: 0, // OpenAI 클라이언트의 자체 재시도 비활성화
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
      // 디버깅을 위한 로그 추가
      console.log('OpenAIService.createChatStream called:', {
        baseURL,
        model,
        messagesCount: messages.length,
        timestamp: new Date().toISOString()
      });
      
      // 추가 디버깅: alert로 API 호출 시도 확인
      alert(`API 호출 시도! baseURL: ${baseURL}, messages: ${messages.length}개`);

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
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { retry } from '@/utils/retry';

// Configure OpenAI client
// In development, we expect a mock server to be running on localhost:3001
const openai = new OpenAI({
  apiKey:  'test-key',
  baseURL: 'http://localhost:3001/v1',
  dangerouslyAllowBrowser: true,
});

export interface ChatStreamOptions {
  messages: ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

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
      const stream = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }, { signal });

      for await (const chunk of stream) {
        if (signal?.aborted) {
          throw new Error('Stream aborted');
        }

        const content = chunk.choices[0]?.delta?.content || '';
        if (content && onChunk) {
          onChunk(content);
        }

        // Check if stream is finished
        if (chunk.choices[0]?.finish_reason === 'stop') {
          onComplete?.();
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message === 'Stream aborted') {
          onError?.(new Error('스트리밍이 취소되었습니다.'));
        } else if (error.message.includes('429')) {
          onError?.(new Error('요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'));
        } else if (error.message.includes('401')) {
          onError?.(new Error('인증에 실패했습니다. API 키를 확인해주세요.'));
        } else {
          onError?.(new Error(`오류가 발생했습니다: ${error.message}`));
        }
      } else {
        onError?.(new Error('알 수 없는 오류가 발생했습니다.'));
      }
    }
  }

  static async createChatCompletion(
    messages: ChatCompletionMessageParam[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      enableRetry?: boolean;
    }
  ): Promise<string> {
    const createCompletion = async () => {
      const response = await openai.chat.completions.create({
        model: options?.model || 'gpt-3.5-turbo',
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000,
        stream: false,
      });

      return response.choices[0]?.message?.content || '';
    };

    if (options?.enableRetry !== false) {
      return retry(createCompletion, {
        maxAttempts: 3,
        onRetry: (error, attempt) => {
          console.warn(`채팅 생성 재시도 (${attempt}/3):`, error.message);
        },
      });
    }

    try {
      return await createCompletion();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`채팅 생성 실패: ${error.message}`);
      }
      throw new Error('채팅 생성 중 알 수 없는 오류가 발생했습니다.');
    }
  }
}
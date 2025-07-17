import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionChunk } from 'openai/resources/chat/completions';

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
    const stream = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }, { signal });

    let detectedContentType: string | undefined;
    
    for await (const chunk of stream) {
      // Check abort status first
      if (signal?.aborted) {
        break;  // Exit the loop instead of throwing
      }

      const content = chunk.choices[0]?.delta?.content || '';
      const contentType = (chunk.choices[0]?.delta as DeltaWithContentType)?.contentType;
      
      // Store contentType when first detected
      if (contentType && !detectedContentType) {
        detectedContentType = contentType;
      }
      
      if (content && onChunk) {
        onChunk(content, detectedContentType);
      }

      // Check if stream is finished
      if (chunk.choices[0]?.finish_reason === 'stop') {
        onComplete?.();
        break;
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
import { Observable } from 'rxjs';

export interface SummarizeOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface SummarizeResult {
  summary: string;
  tokensUsed: number;
  cost: number;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

export type StreamChunkType = 'start' | 'chunk' | 'complete' | 'error';
export interface StreamChunk {
  type: StreamChunkType;
  content?: string;
  data?: SummarizeResult;
  error?: string;
}

export class LLMServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly apiError?: unknown,
  ) {
    super(message);
    this.name = 'LLMServiceError';
  }
}

export class LLMRateLimitError extends LLMServiceError {
  constructor(
    message: string = 'Rate limit exceeded',
    public readonly retryAfter?: number,
    apiError?: unknown,
  ) {
    super(message, 429, apiError);
    this.name = 'LLMRateLimitError';
  }
}

export interface ILLMService {
  /**
   * Summarize text using LLM with streaming support (Server-Sent Events)
   *
   * @param text Text to summarize
   * @param options Optional summarization options
   * @returns Observable stream of chunks
   * @throws LLMServiceError if API call fails
   * @throws LLMRateLimitError if rate limit is exceeded
   */
  streamSummarize(
    text: string,
    options?: SummarizeOptions,
  ): Observable<StreamChunk>;
}

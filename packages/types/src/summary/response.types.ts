export interface SummarizeResponse {
  id: string;
  summary: string;
  tokensUsed: number;
  cost: number;
  completedAt: Date;
  model: string;
}

export interface StreamChunk {
  type: 'start' | 'chunk' | 'complete' | 'error';
  content?: string;
  data?: SummarizeResponse;
  error?: string;
}

export interface SummarizeRequest {
  text: string;
  userId?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface SummarizeOptions {
  stream?: boolean;
  model?: string;
}

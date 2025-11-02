export type {
  SummarizeRequest,
  SummarizeOptions,
  SummarizeResponse,
  StreamChunk,
} from '@smart-summary/types';

export interface SummarizeFormData {
  text: string;
}

export interface SummaryState {
  summary: string;
  isStreaming: boolean;
  isComplete: boolean;
  tokensUsed?: number;
  cost?: number;
  model?: string;
  error?: string;
}

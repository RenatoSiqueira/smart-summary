export class SummarizeResponseDto {
  id: string;
  summary: string;
  tokensUsed: number;
  cost: number;
  completedAt: Date;
  model?: string;
}

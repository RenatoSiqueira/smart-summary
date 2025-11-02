export interface AnalyticsMetrics {
  totalRequests: number;
  totalTokensUsed: number;
  totalCost: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
  requestsByDay: DailyMetric[];
}

export interface DailyMetric {
  date: string;
  requests: number;
  tokensUsed: number;
  cost: number;
}

export interface SummaryRequestRecord {
  id: string;
  text: string;
  summary: string;
  userId?: string;
  tokensUsed: number;
  cost: number;
  model: string;
  createdAt: Date;
  completedAt: Date;
}

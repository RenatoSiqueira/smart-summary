import { AnalyticsMetrics, DailyMetric } from '@smart-summary/types';

export class AnalyticsResponseDto implements AnalyticsMetrics {
  totalRequests: number;
  totalTokensUsed: number;
  totalCost: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
  requestsByDay: DailyMetric[];

  constructor(data: Partial<AnalyticsResponseDto>) {
    this.totalRequests = data.totalRequests || 0;
    this.totalTokensUsed = data.totalTokensUsed || 0;
    this.totalCost = data.totalCost || 0;
    this.averageTokensPerRequest = data.averageTokensPerRequest || 0;
    this.averageCostPerRequest = data.averageCostPerRequest || 0;
    this.requestsByDay = data.requestsByDay || [];
  }
}

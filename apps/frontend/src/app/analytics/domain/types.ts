import type {
  AnalyticsMetrics,
  DailyMetric,
  SummaryRequestRecord,
} from '@smart-summary/types';

export type { AnalyticsMetrics, DailyMetric, SummaryRequestRecord };

export interface AnalyticsFilters {
  startDate?: Date | string;
  endDate?: Date | string;
  clientIp?: string;
}

export interface AnalyticsState {
  metrics: AnalyticsMetrics | null;
  loading: boolean;
  error: string | null;
  filters: AnalyticsFilters;
}

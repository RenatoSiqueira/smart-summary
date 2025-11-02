'use server';

import { fetchFromBackend, getApiKey } from '@/shared/lib/http-client';
import type { AnalyticsMetrics } from '@smart-summary/types';

export async function getAnalyticsAction(filters?: {
  startDate?: Date | string;
  endDate?: Date | string;
  clientIp?: string;
}): Promise<{ success: boolean; data?: AnalyticsMetrics; error?: string }> {
  try {
    const apiKey = getApiKey();

    const params = new URLSearchParams();
    if (filters?.startDate) {
      const date =
        filters.startDate instanceof Date
          ? filters.startDate
          : new Date(filters.startDate);
      params.append('startDate', date.toISOString().split('T')[0] || '');
    }
    if (filters?.endDate) {
      const date =
        filters.endDate instanceof Date
          ? filters.endDate
          : new Date(filters.endDate);
      params.append('endDate', date.toISOString().split('T')[0] || '');
    }
    if (filters?.clientIp) {
      params.append('clientIp', filters.clientIp);
    }

    const queryString = params.toString();
    const url = `/api/analytics${queryString ? `?${queryString}` : ''}`;

    const data = await fetchFromBackend<AnalyticsMetrics>(url, {
      apiKey,
      method: 'GET',
    });

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch analytics',
    };
  }
}

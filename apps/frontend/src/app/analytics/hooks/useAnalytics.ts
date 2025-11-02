'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsAction } from '../actions/get-analytics.action';
import type { AnalyticsMetrics } from '@smart-summary/types';
import type { AnalyticsFilters } from '../domain/types';

interface UseAnalyticsOptions {
  autoFetch?: boolean;
  initialFilters?: AnalyticsFilters;
}

interface UseAnalyticsReturn {
  metrics: AnalyticsMetrics | null;
  loading: boolean;
  error: string | null;
  filters: AnalyticsFilters;
  fetchAnalytics: (filters?: AnalyticsFilters) => Promise<void>;
  updateFilters: (filters: AnalyticsFilters) => void;
  refetch: () => Promise<void>;
}

export function useAnalytics(
  options: UseAnalyticsOptions = {},
): UseAnalyticsReturn {
  const { autoFetch = true, initialFilters = {} } = options;

  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>(initialFilters);

  const fetchAnalytics = useCallback(
    async (newFilters?: AnalyticsFilters) => {
      setLoading(true);
      setError(null);

      try {
        const filtersToUse = newFilters || filters;
        const result = await getAnalyticsAction(filtersToUse);

        if (result.success && result.data) {
          setMetrics(result.data);
          if (newFilters) {
            setFilters(newFilters);
          }
        } else {
          setError(result.error || 'Failed to fetch analytics');
          setMetrics(null);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        setMetrics(null);
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  const updateFilters = useCallback((newFilters: AnalyticsFilters) => {
    setFilters(newFilters);
  }, []);

  const refetch = useCallback(async () => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (autoFetch) {
      void fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    metrics,
    loading,
    error,
    filters,
    fetchAnalytics,
    updateFilters,
    refetch,
  };
}

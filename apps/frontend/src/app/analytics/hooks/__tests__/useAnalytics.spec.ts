import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnalytics } from '../useAnalytics';
import { getAnalyticsAction } from '../../actions/get-analytics.action';
import type { AnalyticsMetrics } from '@smart-summary/types';

vi.mock('../../actions/get-analytics.action', () => ({
  getAnalyticsAction: vi.fn(),
}));

describe('useAnalytics', () => {
  const mockGetAnalyticsAction = vi.mocked(getAnalyticsAction);

  const mockMetrics: AnalyticsMetrics = {
    totalRequests: 100,
    totalTokensUsed: 50000,
    totalCost: 0.5,
    averageTokensPerRequest: 500,
    averageCostPerRequest: 0.005,
    requestsByDay: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state when autoFetch is true', async () => {
    mockGetAnalyticsAction.mockResolvedValue({
      success: true,
      data: mockMetrics,
    });

    const { result } = renderHook(() => useAnalytics({ autoFetch: true }));

    expect(result.current.loading).toBe(true);
    expect(result.current.metrics).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.filters).toEqual({});

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should initialize without auto-fetching when autoFetch is false', () => {
    const { result } = renderHook(() => useAnalytics({ autoFetch: false }));

    expect(result.current.loading).toBe(false);
    expect(result.current.metrics).toBeNull();
    expect(mockGetAnalyticsAction).not.toHaveBeenCalled();
  });

  it('should initialize with initial filters', () => {
    const initialFilters = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    const { result } = renderHook(() =>
      useAnalytics({
        autoFetch: false,
        initialFilters,
      }),
    );

    expect(result.current.filters).toEqual(initialFilters);
  });

  it('should fetch analytics successfully', async () => {
    mockGetAnalyticsAction.mockResolvedValue({
      success: true,
      data: mockMetrics,
    });

    const { result } = renderHook(() => useAnalytics({ autoFetch: false }));

    expect(result.current.loading).toBe(false);

    await result.current.fetchAnalytics();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.metrics).toEqual(mockMetrics);
      expect(result.current.error).toBeNull();
      expect(mockGetAnalyticsAction).toHaveBeenCalledWith({});
    });
  });

  it('should update filters when fetching with new filters', async () => {
    mockGetAnalyticsAction.mockResolvedValue({
      success: true,
      data: mockMetrics,
    });

    const { result } = renderHook(() => useAnalytics({ autoFetch: false }));

    const newFilters = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      clientIp: '127.0.0.1',
    };

    await result.current.fetchAnalytics(newFilters);

    await waitFor(() => {
      expect(result.current.filters).toEqual(newFilters);
      expect(mockGetAnalyticsAction).toHaveBeenCalledWith(newFilters);
    });
  });

  it('should use existing filters when fetching without new filters', async () => {
    mockGetAnalyticsAction.mockResolvedValue({
      success: true,
      data: mockMetrics,
    });

    const initialFilters = {
      startDate: new Date('2024-01-01'),
    };

    const { result } = renderHook(() =>
      useAnalytics({
        autoFetch: false,
        initialFilters,
      }),
    );

    await result.current.fetchAnalytics();

    await waitFor(() => {
      expect(mockGetAnalyticsAction).toHaveBeenCalledWith(initialFilters);
    });
  });

  it('should handle fetch error', async () => {
    const errorMessage = 'Failed to fetch analytics';
    mockGetAnalyticsAction.mockResolvedValue({
      success: false,
      error: errorMessage,
    });

    const { result } = renderHook(() => useAnalytics({ autoFetch: false }));

    await result.current.fetchAnalytics();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.metrics).toBeNull();
      expect(result.current.error).toBe(errorMessage);
    });
  });

  it('should handle fetch exception', async () => {
    const errorMessage = 'Network error';
    mockGetAnalyticsAction.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useAnalytics({ autoFetch: false }));

    await result.current.fetchAnalytics();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.metrics).toBeNull();
      expect(result.current.error).toBe(errorMessage);
    });
  });

  it('should handle non-Error exception', async () => {
    mockGetAnalyticsAction.mockRejectedValue('String error');

    const { result } = renderHook(() => useAnalytics({ autoFetch: false }));

    await result.current.fetchAnalytics();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('An unexpected error occurred');
    });
  });

  it('should refetch analytics', async () => {
    mockGetAnalyticsAction.mockResolvedValue({
      success: true,
      data: mockMetrics,
    });

    const { result } = renderHook(() => useAnalytics({ autoFetch: false }));

    await result.current.fetchAnalytics();

    await waitFor(() => {
      expect(mockGetAnalyticsAction).toHaveBeenCalledTimes(1);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(mockGetAnalyticsAction).toHaveBeenCalledTimes(2);
    });
  });

  it('should set loading state during fetch', async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockGetAnalyticsAction.mockReturnValue(
      promise as Promise<{
        success: boolean;
        data?: AnalyticsMetrics | undefined;
        error?: string | undefined;
      }>,
    );

    const { result } = renderHook(() => useAnalytics({ autoFetch: true }));

    const fetchPromise = result.current.fetchAnalytics();

    expect(result.current.loading).toBe(true);

    resolvePromise!({
      success: true,
      data: mockMetrics,
    });

    await fetchPromise;

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle success false without error message', async () => {
    mockGetAnalyticsAction.mockResolvedValue({
      success: false,
    });

    const { result } = renderHook(() => useAnalytics({ autoFetch: false }));

    await result.current.fetchAnalytics();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.metrics).toBeNull();
      expect(result.current.error).toBe('Failed to fetch analytics');
    });
  });
});

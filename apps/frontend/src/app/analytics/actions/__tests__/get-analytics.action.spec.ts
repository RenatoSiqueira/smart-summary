import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAnalyticsAction } from '../get-analytics.action';
import { fetchFromBackend, getApiKey } from '@/shared/lib/http-client';
import type { AnalyticsMetrics } from '@smart-summary/types';

vi.mock('@/shared/lib/http-client', () => ({
  fetchFromBackend: vi.fn(),
  getApiKey: vi.fn(),
}));

describe('getAnalyticsAction', () => {
  const mockFetchFromBackend = vi.mocked(fetchFromBackend);
  const mockGetApiKey = vi.mocked(getApiKey);

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
    mockGetApiKey.mockReturnValue('test-api-key');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch analytics without filters', async () => {
    mockFetchFromBackend.mockResolvedValue(mockMetrics);

    const result = await getAnalyticsAction();

    expect(result).toEqual({
      success: true,
      data: mockMetrics,
    });
    expect(mockGetApiKey).toHaveBeenCalled();
    expect(mockFetchFromBackend).toHaveBeenCalledWith('/api/analytics', {
      apiKey: 'test-api-key',
      method: 'GET',
    });
  });

  it('should fetch analytics with startDate filter', async () => {
    mockFetchFromBackend.mockResolvedValue(mockMetrics);

    const startDate = new Date('2024-01-01');
    const result = await getAnalyticsAction({ startDate });

    expect(result.success).toBe(true);
    expect(mockFetchFromBackend).toHaveBeenCalledWith(
      '/api/analytics?startDate=2024-01-01',
      {
        apiKey: 'test-api-key',
        method: 'GET',
      },
    );
  });

  it('should fetch analytics with endDate filter', async () => {
    mockFetchFromBackend.mockResolvedValue(mockMetrics);

    const endDate = new Date('2024-01-31');
    const result = await getAnalyticsAction({ endDate });

    expect(result.success).toBe(true);
    expect(mockFetchFromBackend).toHaveBeenCalledWith(
      '/api/analytics?endDate=2024-01-31',
      {
        apiKey: 'test-api-key',
        method: 'GET',
      },
    );
  });

  it('should fetch analytics with clientIp filter', async () => {
    mockFetchFromBackend.mockResolvedValue(mockMetrics);

    const result = await getAnalyticsAction({ clientIp: '127.0.0.1' });

    expect(result.success).toBe(true);
    expect(mockFetchFromBackend).toHaveBeenCalledWith(
      '/api/analytics?clientIp=127.0.0.1',
      {
        apiKey: 'test-api-key',
        method: 'GET',
      },
    );
  });

  it('should fetch analytics with all filters', async () => {
    mockFetchFromBackend.mockResolvedValue(mockMetrics);

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    const result = await getAnalyticsAction({
      startDate,
      endDate,
      clientIp: '127.0.0.1',
    });

    expect(result.success).toBe(true);
    expect(mockFetchFromBackend).toHaveBeenCalledWith(
      expect.stringContaining('/api/analytics?'),
      {
        apiKey: 'test-api-key',
        method: 'GET',
      },
    );

    const url = (mockFetchFromBackend.mock.calls[0]?.[0] as string) || '';
    expect(url).toContain('startDate=2024-01-01');
    expect(url).toContain('endDate=2024-01-31');
    expect(url).toContain('clientIp=127.0.0.1');
  });

  it('should handle startDate as string', async () => {
    mockFetchFromBackend.mockResolvedValue(mockMetrics);

    const result = await getAnalyticsAction({
      startDate: '2024-01-01',
    });

    expect(result.success).toBe(true);
    expect(mockFetchFromBackend).toHaveBeenCalledWith(
      '/api/analytics?startDate=2024-01-01',
      expect.any(Object),
    );
  });

  it('should handle endDate as string', async () => {
    mockFetchFromBackend.mockResolvedValue(mockMetrics);

    const result = await getAnalyticsAction({
      endDate: '2024-01-31',
    });

    expect(result.success).toBe(true);
    expect(mockFetchFromBackend).toHaveBeenCalledWith(
      '/api/analytics?endDate=2024-01-31',
      expect.any(Object),
    );
  });

  it('should format dates correctly', async () => {
    mockFetchFromBackend.mockResolvedValue(mockMetrics);

    const startDate = new Date('2024-01-01T12:00:00Z');
    await getAnalyticsAction({ startDate });

    const url = (mockFetchFromBackend.mock.calls[0]?.[0] as string) || '';
    expect(url).toContain('startDate=2024-01-01');
  });

  it('should handle fetch error', async () => {
    const error = new Error('Network error');
    mockFetchFromBackend.mockRejectedValue(error);

    const result = await getAnalyticsAction();

    expect(result).toEqual({
      success: false,
      error: 'Network error',
    });
  });

  it('should handle non-Error exception', async () => {
    mockFetchFromBackend.mockRejectedValue('String error');

    const result = await getAnalyticsAction();

    expect(result).toEqual({
      success: false,
      error: 'Failed to fetch analytics',
    });
  });

  it('should handle null exception', async () => {
    mockFetchFromBackend.mockRejectedValue(null);

    const result = await getAnalyticsAction();

    expect(result).toEqual({
      success: false,
      error: 'Failed to fetch analytics',
    });
  });

  it('should build URL without query string when no filters', async () => {
    mockFetchFromBackend.mockResolvedValue(mockMetrics);

    await getAnalyticsAction();

    expect(mockFetchFromBackend).toHaveBeenCalledWith(
      '/api/analytics',
      expect.any(Object),
    );
  });

  it('should handle empty string startDate', async () => {
    mockFetchFromBackend.mockResolvedValue(mockMetrics);

    const result = await getAnalyticsAction({ startDate: '' });

    expect(result.success).toBe(true);
  });
});

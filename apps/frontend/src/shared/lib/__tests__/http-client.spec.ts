import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFromBackend, getApiKey } from '../http-client';
import type { ApiError } from '@/shared/types/common.types';

describe('http-client', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    global.fetch = vi.fn();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_API_URL: 'http://localhost:3000',
      API_KEY: 'test-api-key',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  describe('fetchFromBackend', () => {
    it('should make a successful request with default headers', async () => {
      const mockData = { id: '123', name: 'Test' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      } as Response);

      global.fetch = mockFetch;

      const result = await fetchFromBackend<typeof mockData>('/api/test');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/test', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockData);
    });

    it('should append endpoint without leading slash', async () => {
      const mockData = { success: true };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      } as Response);

      global.fetch = mockFetch;

      await fetchFromBackend('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/test',
        expect.any(Object),
      );
    });

    it('should include API key in headers when provided', async () => {
      const mockData = { success: true };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      } as Response);

      global.fetch = mockFetch;

      await fetchFromBackend('/api/test', { apiKey: 'custom-key' });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/test', {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'custom-key',
        },
      });
    });

    it('should merge custom headers', async () => {
      const mockData = { success: true };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      } as Response);

      global.fetch = mockFetch;

      await fetchFromBackend('/api/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/test', {
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
      });
    });

    it('should pass through fetch options', async () => {
      const mockData = { success: true };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      } as Response);

      global.fetch = mockFetch;

      await fetchFromBackend('/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ test: 'data' }),
        }),
      );
    });

    it('should throw ApiError with default message when response is not ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({}),
      } as Response);

      global.fetch = mockFetch;

      await expect(fetchFromBackend('/api/test')).rejects.toMatchObject({
        message: 'Request failed with status 404',
        statusCode: 404,
      } as ApiError);
    });

    it('should throw ApiError with message from error response', async () => {
      const errorResponse = { message: 'Custom error message' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve(errorResponse),
      } as Response);

      global.fetch = mockFetch;

      await expect(fetchFromBackend('/api/test')).rejects.toMatchObject({
        message: 'Custom error message',
        statusCode: 400,
      } as ApiError);
    });

    it('should throw ApiError with code from error response', async () => {
      const errorResponse = { message: 'Error', code: 'VALIDATION_ERROR' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve(errorResponse),
      } as Response);

      global.fetch = mockFetch;

      await expect(fetchFromBackend('/api/test')).rejects.toMatchObject({
        message: 'Error',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      } as ApiError);
    });

    it('should throw ApiError with code only when message is missing', async () => {
      const errorResponse = { code: 'VALIDATION_ERROR' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve(errorResponse),
      } as Response);

      global.fetch = mockFetch;

      await expect(fetchFromBackend('/api/test')).rejects.toMatchObject({
        message: 'Request failed with status 400',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      } as ApiError);
    });

    it('should handle non-parseable error response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response);

      global.fetch = mockFetch;

      await expect(fetchFromBackend('/api/test')).rejects.toThrow(
        'Failed to parse error response',
      );
    });

    it('should ignore invalid error response structure', async () => {
      const errorResponse = { invalid: 'structure' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve(errorResponse),
      } as Response);

      global.fetch = mockFetch;

      await expect(fetchFromBackend('/api/test')).rejects.toMatchObject({
        message: 'Request failed with status 500',
        statusCode: 500,
      } as ApiError);
    });

    it('should ignore empty error message strings', async () => {
      const errorResponse = { message: '', code: 'ERROR' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve(errorResponse),
      } as Response);

      global.fetch = mockFetch;

      await expect(fetchFromBackend('/api/test')).rejects.toMatchObject({
        message: 'Request failed with status 400',
        statusCode: 400,
      } as ApiError);
    });
  });

  describe('getApiKey', () => {
    it('should return API key from environment variable', () => {
      process.env.API_KEY = 'test-key-123';
      expect(getApiKey()).toBe('test-key-123');
    });

    it('should throw error when API_KEY is not set', () => {
      delete process.env.API_KEY;
      expect(() => getApiKey()).toThrow(
        'API_KEY environment variable is not set',
      );
    });

    it('should throw error when API_KEY is empty string', () => {
      process.env.API_KEY = '';
      expect(() => getApiKey()).toThrow(
        'API_KEY environment variable is not set',
      );
    });
  });
});

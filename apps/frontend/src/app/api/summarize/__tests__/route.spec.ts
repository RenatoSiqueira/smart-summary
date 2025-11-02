import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getApiKey } from '@/shared/lib/http-client';

vi.mock('@/shared/lib/http-client', () => ({
  getApiKey: vi.fn(),
}));

describe('POST /api/summarize', () => {
  const mockGetApiKey = vi.mocked(getApiKey);
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiKey.mockReturnValue('test-api-key');
    global.fetch = vi.fn();
    process.env = {
      ...originalEnv,
      API_URL: 'http://localhost:3001',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  const createRequest = (body: unknown): NextRequest => {
    return {
      json: async () => Promise.resolve(body),
    } as NextRequest;
  };

  it('should proxy SSE stream successfully', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`),
        );
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
    } as Response);

    global.fetch = mockFetch;

    const request = createRequest({ text: 'Test text' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Connection')).toBe('keep-alive');
    expect(mockGetApiKey).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/summary',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
        body: JSON.stringify({ text: 'Test text' }),
      },
    );
  });

  it('should return 400 when text is missing', async () => {
    const request = createRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'Text is required' });
    expect(mockGetApiKey).not.toHaveBeenCalled();
  });

  it('should return 400 when text is not a string', async () => {
    const request = createRequest({ text: 123 });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'Text is required' });
  });

  it('should return 400 when text is null', async () => {
    const request = createRequest({ text: null });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'Text is required' });
  });

  it('should return 400 when text is empty string', async () => {
    const request = createRequest({ text: '' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'Text is required' });
  });

  it('should handle backend error response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    global.fetch = mockFetch;

    const request = createRequest({ text: 'Test text' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: 'Backend request failed: Internal Server Error',
    });
  });

  it('should handle backend 404 response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    global.fetch = mockFetch;

    const request = createRequest({ text: 'Test text' });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({
      error: 'Backend request failed: Not Found',
    });
  });

  it('should handle null response body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
    } as Response);

    global.fetch = mockFetch;

    const request = createRequest({ text: 'Test text' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: 'Backend response body is null',
    });
  });

  it('should handle fetch exception', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const fetchError = new Error('Network error');
    const mockFetch = vi.fn().mockRejectedValue(fetchError);

    global.fetch = mockFetch;

    const request = createRequest({ text: 'Test text' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: 'Network error',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Summarize proxy error:',
      fetchError,
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle non-Error exception', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const mockFetch = vi.fn().mockRejectedValue('String error');

    global.fetch = mockFetch;

    const request = createRequest({ text: 'Test text' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: 'Failed to process summarize request',
    });

    consoleErrorSpy.mockRestore();
  });

  it('should handle JSON parsing error', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const request = {
      json: async () => {
        return Promise.reject(new Error('Invalid JSON'));
      },
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: 'Invalid JSON',
    });

    consoleErrorSpy.mockRestore();
  });

  it('should use default BACKEND_URL when not set', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`),
        );
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
    } as Response);

    global.fetch = mockFetch;

    const request = createRequest({ text: 'Test text' });
    await POST(request);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/summary',
      expect.any(Object),
    );
  });

  it('should preserve stream chunks', async () => {
    const chunks: Uint8Array[] = [];
    const encoder = new TextEncoder();

    chunks.push(
      encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`),
    );
    chunks.push(
      encoder.encode(
        `data: ${JSON.stringify({ type: 'chunk', content: 'Hello' })}\n\n`,
      ),
    );
    chunks.push(
      encoder.encode(
        `data: ${JSON.stringify({ type: 'complete', data: { summary: 'Hello' } })}\n\n`,
      ),
    );

    const stream = new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(chunk));
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
    } as Response);

    global.fetch = mockFetch;

    const request = createRequest({ text: 'Test text' });
    const response = await POST(request);

    expect(response.body).toBe(stream);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
  });
});

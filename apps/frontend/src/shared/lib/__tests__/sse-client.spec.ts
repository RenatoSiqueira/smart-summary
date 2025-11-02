/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPostSSEConnection } from '../sse-client';
import type { StreamChunk } from '@smart-summary/types';

describe('sse-client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
  });

  describe('createPostSSEConnection', () => {
    it('should create SSE connection and process chunks', async () => {
      const chunks: StreamChunk[] = [];
      const errors: Error[] = [];

      const mockChunks = [
        { type: 'start' },
        { type: 'chunk', content: 'Hello' },
        { type: 'chunk', content: ' World' },
        {
          type: 'complete',
          data: {
            summary: 'Hello World',
            tokensUsed: 100,
            cost: 0.001,
            model: 'gpt-3.5-turbo',
          },
        },
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          mockChunks.forEach((chunk) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
            );
          });
          controller.close();
        },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: stream,
      } as Response);

      global.fetch = mockFetch;

      const cleanup = await createPostSSEConnection(
        '/api/summarize',
        { text: 'test' },
        '',
        (chunk) => chunks.push(chunk),
        (error) => errors.push(error),
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'test' }),
      });

      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual({ type: 'start' });
      expect(chunks[1]).toEqual({ type: 'chunk', content: 'Hello' });
      expect(chunks[2]).toEqual({ type: 'chunk', content: ' World' });
      expect(chunks[3]).toEqual({
        type: 'complete',
        data: {
          summary: 'Hello World',
          tokensUsed: 100,
          cost: 0.001,
          model: 'gpt-3.5-turbo',
        },
      });

      cleanup();
    });

    it('should include API key in headers when provided', async () => {
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

      await createPostSSEConnection(
        '/api/summarize',
        { text: 'test' },
        'test-api-key',
        vi.fn(),
        vi.fn(),
      );

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/summarize',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
          }),
        }),
      );
    });

    it('should handle complete chunk with data', async () => {
      const chunks: StreamChunk[] = [];

      const completeChunk = {
        type: 'complete',
        data: {
          summary: 'Summary text',
          tokensUsed: 150,
          cost: 0.002,
          model: 'gpt-4',
        },
      };

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(completeChunk)}\n\n`),
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

      await createPostSSEConnection(
        '/api/summarize',
        { text: 'test' },
        '',
        (chunk) => chunks.push(chunk),
        vi.fn(),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual(completeChunk);
    });

    it('should handle error chunk', async () => {
      const errors: Error[] = [];

      const errorChunk = {
        type: 'error',
        error: 'Something went wrong',
      };

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`),
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

      await createPostSSEConnection(
        '/api/summarize',
        { text: 'test' },
        '',
        vi.fn(),
        (error) => errors.push(error),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should throw error when response is not ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      global.fetch = mockFetch;

      await expect(
        createPostSSEConnection(
          '/api/summarize',
          { text: 'test' },
          '',
          vi.fn(),
          vi.fn(),
        ),
      ).rejects.toThrow('SSE connection failed: Internal Server Error');
    });

    it('should throw error when response body is null', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      } as Response);

      global.fetch = mockFetch;

      await expect(
        createPostSSEConnection(
          '/api/summarize',
          { text: 'test' },
          '',
          vi.fn(),
          vi.fn(),
        ),
      ).rejects.toThrow('Response body is null');
    });

    it('should handle stream processing errors', async () => {
      const errors: Error[] = [];

      const stream = new ReadableStream({
        start(controller) {
          controller.error(new Error('Stream error'));
        },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: stream,
      } as Response);

      global.fetch = mockFetch;

      await createPostSSEConnection(
        '/api/summarize',
        { text: 'test' },
        '',
        vi.fn(),
        (error) => errors.push(error),
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid JSON chunks', async () => {
      const errors: Error[] = [];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: invalid json\n\n'));
          controller.close();
        },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: stream,
      } as Response);

      global.fetch = mockFetch;

      await createPostSSEConnection(
        '/api/summarize',
        { text: 'test' },
        '',
        vi.fn(),
        (error) => errors.push(error),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid chunk structure', async () => {
      const errors: Error[] = [];

      const invalidChunk = { type: 'invalid', unknown: 'field' };
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(invalidChunk)}\n\n`),
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

      await createPostSSEConnection(
        '/api/summarize',
        { text: 'test' },
        '',
        vi.fn(),
        (error) => errors.push(error),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle buffer accumulation across multiple reads', async () => {
      const chunks: StreamChunk[] = [];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'start' })}`),
          );
          controller.enqueue(encoder.encode('\n\n'));
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'chunk', content: 'Hello' })}`,
            ),
          );
          controller.enqueue(encoder.encode('\n\n'));
          controller.close();
        },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: stream,
      } as Response);

      global.fetch = mockFetch;

      await createPostSSEConnection(
        '/api/summarize',
        { text: 'test' },
        '',
        (chunk) => chunks.push(chunk),
        vi.fn(),
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should return cleanup function that cancels stream', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`),
          );
        },
      });

      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
      const mockBody = {
        getReader: () => {
          reader = stream.getReader();
          return reader;
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      } as Response);

      global.fetch = mockFetch;

      const cleanup = await createPostSSEConnection(
        '/api/summarize',
        { text: 'test' },
        '',
        vi.fn(),
        vi.fn(),
      );

      expect(reader).not.toBeNull();
      const cancelSpy = vi.spyOn(reader!, 'cancel');

      cleanup();

      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should ignore lines that do not start with "data: "', async () => {
      const chunks: StreamChunk[] = [];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('comment: ignore this\n\n'));
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

      await createPostSSEConnection(
        '/api/summarize',
        { text: 'test' },
        '',
        (chunk) => chunks.push(chunk),
        vi.fn(),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual({ type: 'start' });
    });
  });
});

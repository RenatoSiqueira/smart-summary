import { vi } from 'vitest';

/**
 * Mock fetch utility for tests
 */
export function createMockFetch(
  responseData: object,
  options: {
    ok?: boolean;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const {
    ok = true,
    status = 200,
    statusText = 'OK',
    headers = { 'Content-Type': 'application/json' },
  } = options;

  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText,
    headers: new Headers(headers),
    json: () => Promise.resolve(responseData),
    text: () => Promise.resolve(JSON.stringify(responseData)),
    clone: function () {
      return this;
    },
  } as Response);
}

/**
 * Mock fetch for SSE streams
 */
export function createMockSSEFetch(
  chunks: string[],
  options: {
    ok?: boolean;
    status?: number;
    statusText?: string;
  } = {},
) {
  const { ok = true, status = 200, statusText = 'OK' } = options;

  // Create a mock ReadableStream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach((chunk, index) => {
        setTimeout(() => {
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          if (index === chunks.length - 1) {
            controller.close();
          }
        }, index * 10);
      });
    },
  });

  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText,
    headers: new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    }),
    body: stream,
    clone: function () {
      return this;
    },
  } as Response);
}

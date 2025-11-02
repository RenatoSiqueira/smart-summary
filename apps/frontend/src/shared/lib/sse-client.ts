/**
 * SSE (Server-Sent Events) client utilities
 * Used for handling streaming responses from the backend
 */

import type { StreamChunk } from '@smart-summary/types';

export type StreamChunkType = 'start' | 'chunk' | 'complete' | 'error';

// Re-export for convenience
export type { StreamChunk };

/**
 * Type guard to validate StreamChunk structure
 */
function isValidStreamChunk(data: unknown): data is StreamChunk {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const chunk = data as Record<string, unknown>;

  // Must have a type field
  if (typeof chunk.type !== 'string') {
    return false;
  }

  // Type must be one of the valid values
  if (!['start', 'chunk', 'complete', 'error'].includes(chunk.type)) {
    return false;
  }

  // If type is 'chunk', content should be string (optional)
  if (chunk.type === 'chunk' && chunk.content !== undefined) {
    if (typeof chunk.content !== 'string') {
      return false;
    }
  }

  // If type is 'complete', data should be object (optional)
  if (chunk.type === 'complete' && chunk.data !== undefined) {
    if (typeof chunk.data !== 'object' || chunk.data === null) {
      return false;
    }
  }

  // If type is 'error', error should be string (optional)
  if (chunk.type === 'error' && chunk.error !== undefined) {
    if (typeof chunk.error !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Safely parses JSON and validates it as a StreamChunk
 */
function parseStreamChunk(jsonString: string): StreamChunk {
  try {
    const parsed = JSON.parse(jsonString) as unknown;
    
    if (!isValidStreamChunk(parsed)) {
      throw new Error('Invalid StreamChunk structure');
    }
    
    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to parse StreamChunk: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * SSE client for POST requests with body
 * Uses fetch with ReadableStream since EventSource doesn't support POST
 */
export async function createPostSSEConnection(
  url: string,
  body: unknown,
  apiKey: string,
  onMessage: (chunk: StreamChunk) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Only add API key if provided (for direct backend connections)
  // When using Next.js API routes, API key is handled server-side
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`SSE connection failed: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader: ReadableStreamDefaultReader<Uint8Array> = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  let isProcessing = true;
  const processStream = async (): Promise<void> => {
    try {
      while (isProcessing) {
        const readResult = await reader.read();
        const done = readResult.done === true;
        const value = readResult.value;

        if (done) {
          isProcessing = false;
          break;
        }

        if (value !== undefined) {
          buffer += decoder.decode(value, { stream: true });
        }

        // Process complete SSE messages (lines ending with \n\n)
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk = parseStreamChunk(line.slice(6));
              onMessage(chunk);
            } catch (error) {
              onError(
                error instanceof Error
                  ? error
                  : new Error('Failed to parse SSE message')
              );
            }
          }
        }
      }
    } catch (error) {
      isProcessing = false;
      onError(
        error instanceof Error ? error : new Error('Stream processing error')
      );
    }
  };

  void processStream();

  // Return cleanup function
  return () => {
    isProcessing = false;
    void reader.cancel();
  };
}


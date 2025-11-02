import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStreamingSummary } from '../useStreamingSummary';
import { createPostSSEConnection } from '@/shared/lib/sse-client';
import type { StreamChunk, SummarizeResponse } from '@smart-summary/types';

vi.mock('@/shared/lib/sse-client', () => ({
  createPostSSEConnection: vi.fn(),
}));

describe('useStreamingSummary', () => {
  const mockCreatePostSSEConnection = vi.mocked(createPostSSEConnection);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useStreamingSummary());

    expect(result.current.state).toEqual({
      summary: '',
      isStreaming: false,
      isComplete: false,
    });
    expect(result.current.state.tokensUsed).toBeUndefined();
    expect(result.current.state.cost).toBeUndefined();
    expect(result.current.state.model).toBeUndefined();
    expect(result.current.state.error).toBeUndefined();
  });

  it('should start streaming and handle start chunk', async () => {
    let onMessageCallback: ((chunk: StreamChunk) => void) | null = null;
    const mockCleanup = vi.fn();

    mockCreatePostSSEConnection.mockImplementation(
      async (_url, _body, _apiKey, onMessage) => {
        onMessageCallback = onMessage;
        return Promise.resolve(mockCleanup);
      },
    );

    const { result } = renderHook(() => useStreamingSummary());

    result.current.startStreaming('test text');

    await waitFor(() => {
      expect(mockCreatePostSSEConnection).toHaveBeenCalledWith(
        '/api/summarize',
        { text: 'test text' },
        '',
        expect.any(Function),
        expect.any(Function),
      );
    });

    await waitFor(() => {
      expect(result.current.state.isStreaming).toBe(true);
    });

    expect(result.current.state.summary).toBe('');

    // Simulate start chunk
    if (onMessageCallback) {
      (onMessageCallback as (chunk: StreamChunk) => void)({ type: 'start' });
    }

    await waitFor(() => {
      expect(result.current.state.isStreaming).toBe(true);
    });
  });

  it('should handle chunk chunks and accumulate summary', async () => {
    let onMessageCallback: ((chunk: StreamChunk) => void) | null = null;
    const mockCleanup = vi.fn();

    mockCreatePostSSEConnection.mockImplementation(
      async (_url, _body, _apiKey, onMessage, _onError) => {
        onMessageCallback = onMessage;
        return Promise.resolve(mockCleanup);
      },
    );

    const { result } = renderHook(() => useStreamingSummary());

    result.current.startStreaming('test text');

    await waitFor(() => {
      expect(mockCreatePostSSEConnection).toHaveBeenCalled();
    });

    // Simulate chunk chunks
    if (onMessageCallback) {
      const callback = onMessageCallback as (chunk: StreamChunk) => void;
      callback({ type: 'chunk', content: 'Hello' });
      callback({ type: 'chunk', content: ' World' });
      callback({ type: 'chunk', content: '!' });
    }

    await waitFor(() => {
      expect(result.current.state.summary).toBe('Hello World!');
    });
  });

  it('should handle complete chunk with data', async () => {
    let onMessageCallback: ((chunk: StreamChunk) => void) | null = null;
    const mockCleanup = vi.fn();
    const onComplete = vi.fn();

    const completeData: SummarizeResponse = {
      id: 'test-id',
      summary: 'Complete summary',
      tokensUsed: 100,
      cost: 0.001,
      model: 'gpt-3.5-turbo',
      completedAt: new Date(),
    };

    mockCreatePostSSEConnection.mockImplementation(
      async (_url, _body, _apiKey, onMessage, _onError) => {
        onMessageCallback = onMessage;
        return Promise.resolve(mockCleanup);
      },
    );

    const { result } = renderHook(() => useStreamingSummary({ onComplete }));

    result.current.startStreaming('test text');

    await waitFor(() => {
      expect(mockCreatePostSSEConnection).toHaveBeenCalled();
    });

    // Simulate complete chunk
    if (onMessageCallback) {
      (onMessageCallback as (chunk: StreamChunk) => void)({
        type: 'complete',
        data: completeData,
      });
    }

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        summary: 'Complete summary',
        isStreaming: false,
        isComplete: true,
        tokensUsed: 100,
        cost: 0.001,
        model: 'gpt-3.5-turbo',
      });
      expect(mockCleanup).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledWith(completeData);
    });
  });

  it('should handle error chunk', async () => {
    let onMessageCallback: ((chunk: StreamChunk) => void) | null = null;
    const mockCleanup = vi.fn();
    const onError = vi.fn();

    mockCreatePostSSEConnection.mockImplementation(
      async (_url, _body, _apiKey, onMessage, _onErrorHandler) => {
        onMessageCallback = onMessage;
        return Promise.resolve(mockCleanup);
      },
    );

    const { result } = renderHook(() => useStreamingSummary({ onError }));

    result.current.startStreaming('test text');

    await waitFor(() => {
      expect(mockCreatePostSSEConnection).toHaveBeenCalled();
    });

    // Simulate error chunk
    if (onMessageCallback) {
      (onMessageCallback as (chunk: StreamChunk) => void)({
        type: 'error',
        error: 'Streaming error',
      });
    }

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        isStreaming: false,
        error: 'Streaming error',
      });
      expect(mockCleanup).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Streaming error',
        }),
      );
    });
  });

  it('should handle stream error callback', async () => {
    let onErrorCallback: ((error: Error) => void) | null = null;
    const mockCleanup = vi.fn();
    const onError = vi.fn();

    mockCreatePostSSEConnection.mockImplementation(
      async (_url, _body, _apiKey, _onMessage, onErrorHandler) => {
        onErrorCallback = onErrorHandler;
        return Promise.resolve(mockCleanup);
      },
    );

    const { result } = renderHook(() => useStreamingSummary({ onError }));

    result.current.startStreaming('test text');

    await waitFor(() => {
      expect(mockCreatePostSSEConnection).toHaveBeenCalled();
    });

    // Simulate stream error
    if (onErrorCallback) {
      (onErrorCallback as (error: Error) => void)(
        new Error('Connection failed'),
      );
    }

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        isStreaming: false,
        error: 'Connection failed',
      });
      expect(mockCleanup).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Connection failed',
        }),
      );
    });
  });

  it('should handle connection creation error', async () => {
    const onError = vi.fn();
    const connectionError = new Error('Failed to connect');

    mockCreatePostSSEConnection.mockRejectedValue(connectionError);

    const { result } = renderHook(() => useStreamingSummary({ onError }));

    result.current.startStreaming('test text');

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        isStreaming: false,
        error: 'Failed to connect',
      });
      expect(onError).toHaveBeenCalledWith(connectionError);
    });
  });

  it('should handle non-Error connection creation error', async () => {
    const onError = vi.fn();

    mockCreatePostSSEConnection.mockRejectedValue('String error');

    const { result } = renderHook(() => useStreamingSummary({ onError }));

    result.current.startStreaming('test text');

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        isStreaming: false,
        error: 'Failed to start streaming',
      });
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to start streaming',
        }),
      );
    });
  });

  it('should stop streaming and call cleanup', async () => {
    const mockCleanup = vi.fn();
    mockCreatePostSSEConnection.mockResolvedValue(mockCleanup);

    const { result } = renderHook(() => useStreamingSummary());

    // Start streaming first
    result.current.startStreaming('test text');

    // Wait for streaming to start
    await waitFor(() => {
      expect(result.current.state.isStreaming).toBe(true);
    });

    // Stop streaming
    result.current.stopStreaming();

    await waitFor(() => {
      expect(mockCleanup).toHaveBeenCalled();
      expect(result.current.state.isStreaming).toBe(false);
    });
  });

  it('should reset state', async () => {
    let onMessageCallback: ((chunk: StreamChunk) => void) | null = null;
    const mockCleanup = vi.fn();

    mockCreatePostSSEConnection.mockImplementation(
      async (_url, _body, _apiKey, onMessage, _onError) => {
        onMessageCallback = onMessage;
        return Promise.resolve(mockCleanup);
      },
    );

    const { result } = renderHook(() => useStreamingSummary());

    result.current.startStreaming('test text');

    await waitFor(() => {
      expect(mockCreatePostSSEConnection).toHaveBeenCalled();
    });

    // Add some summary content
    if (onMessageCallback) {
      (onMessageCallback as (chunk: StreamChunk) => void)({
        type: 'chunk',
        content: 'Some summary',
      });
    }

    await waitFor(() => {
      expect(result.current.state.summary).toBe('Some summary');
    });

    // Reset
    result.current.reset();

    await waitFor(() => {
      expect(result.current.state).toEqual({
        summary: '',
        isStreaming: false,
        isComplete: false,
      });
      expect(mockCleanup).toHaveBeenCalled();
    });
  });

  it('should cleanup on unmount', async () => {
    const mockCleanup = vi.fn();
    mockCreatePostSSEConnection.mockResolvedValue(mockCleanup);

    const { result, unmount } = renderHook(() => useStreamingSummary());

    result.current.startStreaming('test text');

    await waitFor(() => {
      expect(mockCreatePostSSEConnection).toHaveBeenCalled();
      expect(result.current.state.isStreaming).toBe(true);
    });

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
  });

  it('should ignore chunk content when undefined', async () => {
    let onMessageCallback: ((chunk: StreamChunk) => void) | null = null;
    const mockCleanup = vi.fn();

    mockCreatePostSSEConnection.mockImplementation(
      async (_url, _body, _apiKey, onMessage, _onError) => {
        onMessageCallback = onMessage;
        return Promise.resolve(mockCleanup);
      },
    );

    const { result } = renderHook(() => useStreamingSummary());

    result.current.startStreaming('test text');

    await waitFor(() => {
      expect(mockCreatePostSSEConnection).toHaveBeenCalled();
    });

    // Simulate chunk without content
    if (onMessageCallback) {
      (onMessageCallback as (chunk: StreamChunk) => void)({ type: 'chunk' });
    }

    // Summary should remain empty
    expect(result.current.state.summary).toBe('');
  });

  it('should handle stopStreaming when no cleanup exists', () => {
    const { result } = renderHook(() => useStreamingSummary());

    // Stop without starting should not throw
    expect(() => result.current.stopStreaming()).not.toThrow();
    expect(result.current.state.isStreaming).toBe(false);
  });
});

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPostSSEConnection } from '@/shared/lib/sse-client';
import type { StreamChunk, SummarizeResponse } from '@smart-summary/types';
import type { SummaryState } from '../domain/types';

interface UseStreamingSummaryOptions {
  onComplete?: (data: SummarizeResponse) => void;
  onError?: (error: Error) => void;
}

interface UseStreamingSummaryReturn {
  state: SummaryState;
  startStreaming: (text: string) => void;
  stopStreaming: () => void;
  reset: () => void;
}

/**
 * Hook for managing SSE streaming summary
 * Handles EventSource connection, state management, and cleanup
 * Uses Next.js API route that proxies the SSE connection with API key
 */
export function useStreamingSummary(
  options: UseStreamingSummaryOptions = {},
): UseStreamingSummaryReturn {
  const [state, setState] = useState<SummaryState>({
    summary: '',
    isStreaming: false,
    isComplete: false,
  });

  const cleanupRef = useRef<(() => void) | null>(null);
  const { onComplete, onError } = options;

  const startStreaming = useCallback(
    async (text: string) => {
      setState({
        summary: '',
        isStreaming: true,
        isComplete: false,
      });

      try {
        const cleanup = await createPostSSEConnection(
          '/api/summarize',
          { text },
          '',
          (chunk: StreamChunk) => {
            switch (chunk.type) {
              case 'start':
                setState((prev) => ({
                  ...prev,
                  isStreaming: true,
                  summary: '',
                }));
                break;

              case 'chunk':
                if (chunk.content) {
                  setState((prev) => ({
                    ...prev,
                    summary: prev.summary + chunk.content,
                  }));
                }
                break;

              case 'complete':
                if (chunk.data) {
                  setState({
                    summary: chunk.data.summary,
                    isStreaming: false,
                    isComplete: true,
                    tokensUsed: chunk.data.tokensUsed,
                    cost: chunk.data.cost,
                    model: chunk.data.model,
                  });
                  onComplete?.(chunk.data);
                  cleanup?.();
                  cleanupRef.current = null;
                }
                break;

              case 'error':
                if (chunk.error) {
                  const errorMessage =
                    chunk.error || 'Streaming error occurred';
                  const error: Error = new Error(errorMessage);
                  setState((prev) => ({
                    ...prev,
                    isStreaming: false,
                    error: error.message,
                  }));
                  onError?.(error);
                  cleanup?.();
                  cleanupRef.current = null;
                }
                break;
            }
          },
          (error: Error) => {
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              error: error.message,
            }));
            onError?.(error);
            cleanup?.();
            cleanupRef.current = null;
          },
        );

        cleanupRef.current = cleanup;
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error('Failed to start streaming');
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: err.message,
        }));
        onError?.(err);
      }
    },
    [onComplete, onError],
  );

  const stopStreaming = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  const reset = useCallback(() => {
    stopStreaming();
    setState({
      summary: '',
      isStreaming: false,
      isComplete: false,
    });
  }, [stopStreaming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return {
    state,
    startStreaming: startStreaming as (text: string) => void,
    stopStreaming,
    reset,
  };
}

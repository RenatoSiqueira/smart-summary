/**
 * HTTP client utilities for making backend API calls
 * Used by Server Actions to communicate with the NestJS backend
 */

import type { ApiError } from '@/shared/types/common.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface HttpClientOptions extends RequestInit {
  apiKey?: string;
}

/**
 * Type guard to validate error response structure
 */
function isValidErrorResponse(
  data: unknown,
): data is { message?: string; code?: string } {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  if ('message' in obj && obj.message !== undefined) {
    if (typeof obj.message !== 'string') {
      return false;
    }
  }

  if ('code' in obj && obj.code !== undefined) {
    if (typeof obj.code !== 'string') {
      return false;
    }
  }

  return 'message' in obj || 'code' in obj;
}

/**
 * Makes an HTTP request to the backend API
 * Used in Server Actions (server-side only)
 */
export async function fetchFromBackend<T>(
  endpoint: string,
  options: HttpClientOptions = {}
): Promise<T> {
  const { apiKey, ...fetchOptions } = options;

  const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error: ApiError = {
      message: `Request failed with status ${response.status}`,
      statusCode: response.status,
    };

    try {
      const errorData: unknown = await response.json();
      if (isValidErrorResponse(errorData)) {
        const typedError: { message?: string; code?: string } = errorData;
        const message = typedError.message;
        const code = typedError.code;
        if (typeof message === 'string' && message.length > 0) {
          error.message = message;
        }
        if (typeof code === 'string' && code.length > 0) {
          error.code = code;
        }
      }
    } catch {
      throw new Error('Failed to parse error response');
    }

    throw error;
  }

  return response.json() as Promise<T>;
}

export function getApiKey(): string {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error('API_KEY environment variable is not set');
  }
  return apiKey;
}


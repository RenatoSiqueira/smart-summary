import { NextRequest } from 'next/server';
import { getApiKey } from '@/shared/lib/http-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * POST /api/summarize
 * Proxy SSE streaming request to backend with API key handling
 *
 * Body: { text: string }
 *
 * This route is necessary for SSE streaming because Server Actions
 * cannot stream responses. The validation is handled client-side
 * via react-hook-form + Zod in SummarizeForm.
 *
 * This route keeps the API key secure server-side and proxies
 * the SSE stream from the backend NestJS service.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = getApiKey();
    const backendUrl = `${BACKEND_URL}/api/summary`;

    // Forward the request to backend with API key
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `Backend request failed: ${response.statusText}`,
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (!response.body) {
      return new Response(
        JSON.stringify({ error: 'Backend response body is null' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Summarize proxy error:', error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process summarize request',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

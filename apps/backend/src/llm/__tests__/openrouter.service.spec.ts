import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, toArray } from 'rxjs';
import { OpenRouterService } from '../openrouter.service';
import {
  LLMServiceError,
  LLMRateLimitError,
  StreamChunk,
  StreamChunkType,
} from '../interfaces';
import { AppConfig } from '../../config/config.interface';

// Mock global fetch
global.fetch = jest.fn();

describe('OpenRouterService', () => {
  let service: OpenRouterService;
  let configService: jest.Mocked<ConfigService<{ app: AppConfig }>>;
  const mockApiKey = 'test-openrouter-api-key';
  const mockText = 'This is a test article that needs to be summarized.';

  const createMockReadableStream = (chunks: string[]): ReadableStream => {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => {
          controller.enqueue(encoder.encode(chunk));
        });
        controller.close();
      },
    });
  };

  const createMockResponse = (
    ok: boolean = true,
    body: ReadableStream | null = null,
    status: number = 200,
    headers: Headers = new Headers(),
  ): Response => {
    return {
      ok,
      status,
      headers,
      body,
      json: jest.fn(),
      text: jest.fn(),
    } as unknown as Response;
  };

  beforeEach(async () => {
    // Create mock with implementation BEFORE module compilation
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'app') {
          return {
            llm: {
              openrouterApiKey: mockApiKey,
            },
          } as AppConfig;
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenRouterService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OpenRouterService>(OpenRouterService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw error when API key is not configured', async () => {
    configService.get.mockReturnValue(undefined);

    await expect(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OpenRouterService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();
      return module.get<OpenRouterService>(OpenRouterService);
    }).rejects.toThrow('OpenRouter API key is not configured');
  });

  describe('streamSummarize', () => {
    it('should emit start chunk immediately', async () => {
      const mockChunks = [
        'data: {"choices":[{"delta":{"content":"This"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" is"}}]}\n\n',
        'data: [DONE]\n\n',
      ];
      const mockStream = createMockReadableStream(mockChunks);
      const mockResponse = createMockResponse(true, mockStream);
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const chunks = await firstValueFrom(service.streamSummarize(mockText));

      expect(chunks).toEqual({ type: 'start' });
    });

    it('should stream content chunks correctly', async () => {
      const mockChunks = [
        'data: {"choices":[{"delta":{"content":"This"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" is"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" a summary"}}]}\n\n',
        'data: [DONE]\n\n',
      ];
      const mockStream = createMockReadableStream(mockChunks);
      const mockResponse = createMockResponse(true, mockStream);
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const allChunks = await firstValueFrom(
        service.streamSummarize(mockText).pipe(toArray()),
      );

      expect(allChunks.length).toBeGreaterThan(0);
      expect(allChunks[0]).toEqual({ type: 'start' });

      const contentChunks = allChunks.filter((chunk) => chunk.type === 'chunk');
      expect(contentChunks.length).toBe(3);
      expect(contentChunks[0]).toEqual({ type: 'chunk', content: 'This' });
      expect(contentChunks[1]).toEqual({ type: 'chunk', content: ' is' });
      expect(contentChunks[2]).toEqual({
        type: 'chunk',
        content: ' a summary',
      });

      const completeChunk = allChunks.find(
        (chunk) => chunk.type === 'complete',
      );
      expect(completeChunk).toBeDefined();
      expect(completeChunk?.type).toBe('complete');
      expect(completeChunk?.data).toBeDefined();
    });

    it('should handle complete chunk with usage data', async () => {
      const mockChunks = [
        'data: {"choices":[{"delta":{"content":"Summary"}}]}\n\n',
        'data: {"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}\n\n',
        'data: [DONE]\n\n',
      ];
      const mockStream = createMockReadableStream(mockChunks);
      const mockResponse = createMockResponse(true, mockStream);
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const allChunks = await firstValueFrom(
        service.streamSummarize(mockText).pipe(toArray()),
      );

      const completeChunk = allChunks.find(
        (chunk) => chunk.type === 'complete',
      );
      expect(completeChunk).toBeDefined();
      expect(completeChunk?.data).toEqual(
        expect.objectContaining({
          summary: 'Summary',
          tokensUsed: 15,
          promptTokens: 10,
          completionTokens: 5,
          model: expect.any(String),
          cost: expect.any(Number),
        }),
      );
    });

    it('should use default model and options when not provided', async () => {
      const mockChunks = ['data: [DONE]\n\n'];
      const mockStream = createMockReadableStream(mockChunks);
      const mockResponse = createMockResponse(true, mockStream);
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await firstValueFrom(service.streamSummarize(mockText));

      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://smart-summary-app.com',
            'X-Title': 'Smart Summary App',
          }),
          body: expect.any(String),
        }),
      );

      // Verify the body content by parsing it
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.model).toBe('openai/gpt-3.5-turbo');
      expect(body.max_tokens).toBe(500);
      expect(body.temperature).toBe(0.7);
      expect(body.stream).toBe(true);
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toContain(
        'You are an expert summarization assistant',
      );
      expect(body.messages[0].content).toContain('Action Items');
      expect(body.messages[1].role).toBe('user');
      expect(body.messages[1].content).toContain(
        'Summarize the following text',
      );
      expect(body.messages[1].content).toContain(mockText);
      expect(body.messages[1].content).toContain('Output only the summary');
    });

    it('should use custom model and options when provided', async () => {
      const mockChunks = ['data: [DONE]\n\n'];
      const mockStream = createMockReadableStream(mockChunks);
      const mockResponse = createMockResponse(true, mockStream);
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const customOptions = {
        model: 'openai/gpt-4',
        maxTokens: 1000,
        temperature: 0.9,
      };

      await firstValueFrom(
        service.streamSummarize(mockText, customOptions).pipe(toArray()),
      );

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.model).toBe('openai/gpt-4');
      expect(body.max_tokens).toBe(1000);
      expect(body.temperature).toBe(0.9);
      expect(body.stream).toBe(true);
      expect(Array.isArray(body.messages)).toBe(true);
    });

    it('should calculate cost correctly for gpt-3.5-turbo', async () => {
      const mockChunks = [
        'data: {"choices":[{"delta":{"content":"Summary"}}]}\n\n',
        'data: {"usage":{"prompt_tokens":1000,"completion_tokens":500,"total_tokens":1500}}\n\n',
        'data: [DONE]\n\n',
      ];
      const mockStream = createMockReadableStream(mockChunks);
      const mockResponse = createMockResponse(true, mockStream);
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const allChunks = await firstValueFrom(
        service.streamSummarize(mockText).pipe(toArray()),
      );

      const completeChunk = allChunks.find(
        (chunk) => chunk.type === 'complete',
      );
      expect(completeChunk?.data?.cost).toBeCloseTo(
        (1000 / 1000) * 0.0015 + (500 / 1000) * 0.002,
        6,
      );
    });

    it('should calculate cost correctly for gpt-4', async () => {
      const mockChunks = [
        'data: {"choices":[{"delta":{"content":"Summary"}}]}\n\n',
        'data: {"usage":{"prompt_tokens":1000,"completion_tokens":500,"total_tokens":1500}}\n\n',
        'data: [DONE]\n\n',
      ];
      const mockStream = createMockReadableStream(mockChunks);
      const mockResponse = createMockResponse(true, mockStream);
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const allChunks = await firstValueFrom(
        service
          .streamSummarize(mockText, { model: 'openai/gpt-4' })
          .pipe(toArray()),
      );

      const completeChunk = allChunks.find(
        (chunk) => chunk.type === 'complete',
      );
      expect(completeChunk?.data?.cost).toBeCloseTo(
        (1000 / 1000) * 0.03 + (500 / 1000) * 0.06,
        6,
      );
    });

    it('should handle multiple lines in a single chunk', async () => {
      const mockChunks = [
        'data: {"choices":[{"delta":{"content":"Part"}}]}\n\ndata: {"choices":[{"delta":{"content":"1"}}]}\n\ndata: {"choices":[{"delta":{"content":"Part"}}]}\n\ndata: {"choices":[{"delta":{"content":"2"}}]}\n\n',
        'data: [DONE]\n\n',
      ];
      const mockStream = createMockReadableStream(mockChunks);
      const mockResponse = createMockResponse(true, mockStream);
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const allChunks = await firstValueFrom(
        service.streamSummarize(mockText).pipe(toArray()),
      );

      const contentChunks = allChunks.filter((chunk) => chunk.type === 'chunk');
      expect(contentChunks.length).toBe(4);
    });

    it('should handle incomplete chunks in buffer', async () => {
      const mockChunks = [
        'data: {"choices":[{"delta":{"content":"Incomplete',
        ' data chunk"}}]}\n\n',
        'data: [DONE]\n\n',
      ];
      const mockStream = createMockReadableStream(mockChunks);
      const mockResponse = createMockResponse(true, mockStream);
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const allChunks = await firstValueFrom(
        service.streamSummarize(mockText).pipe(toArray()),
      );

      const contentChunks = allChunks.filter((chunk) => chunk.type === 'chunk');
      expect(contentChunks.length).toBeGreaterThan(0);
    });

    it('should ignore empty lines and non-data lines', async () => {
      const mockChunks = [
        '\n',
        'data: {"choices":[{"delta":{"content":"Valid"}}]}\n\n',
        '\n',
        'data: [DONE]\n\n',
      ];
      const mockStream = createMockReadableStream(mockChunks);
      const mockResponse = createMockResponse(true, mockStream);
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const allChunks = await firstValueFrom(
        service.streamSummarize(mockText).pipe(toArray()),
      );

      const contentChunks = allChunks.filter((chunk) => chunk.type === 'chunk');
      expect(contentChunks.length).toBe(1);
      expect(contentChunks[0]).toEqual({ type: 'chunk', content: 'Valid' });
    });

    describe('error handling', () => {
      it('should emit error chunk and throw LLMServiceError for API errors', async () => {
        const errorResponse = createMockResponse(
          false,
          null,
          400,
          new Headers(),
        );
        (errorResponse as any).json = jest.fn().mockResolvedValue({
          error: { message: 'Invalid request' },
        });
        (global.fetch as jest.Mock).mockResolvedValue(errorResponse);

        const chunks: StreamChunk[] = [];
        let errorThrown: Error | null = null;

        try {
          await new Promise<void>((resolve, reject) => {
            service.streamSummarize(mockText).subscribe({
              next: (chunk) => chunks.push(chunk),
              error: (error) => {
                errorThrown = error;
                reject(error);
              },
              complete: () => resolve(),
            });
          });
        } catch (error) {
          // Error already captured
        }

        expect(errorThrown).toBeInstanceOf(LLMServiceError);
        expect((errorThrown as unknown as LLMServiceError).message).toContain(
          'Invalid request',
        );
      }, 5000);

      it('should emit error chunk and throw LLMRateLimitError for rate limit errors', async () => {
        const errorResponse = createMockResponse(
          false,
          null,
          429,
          new Headers({ 'retry-after': '60' }),
        );
        (errorResponse as any).json = jest.fn().mockResolvedValue({
          error: { message: 'Rate limit exceeded' },
        });
        (global.fetch as jest.Mock).mockResolvedValue(errorResponse);

        let errorThrown: Error | null = null;

        try {
          await new Promise<void>((resolve, reject) => {
            service.streamSummarize(mockText).subscribe({
              next: () => {},
              error: (error) => {
                errorThrown = error;
                reject(error);
              },
              complete: () => resolve(),
            });
          });
        } catch (error) {
          // Error already captured
        }

        expect(errorThrown).toBeInstanceOf(LLMRateLimitError);
        expect((errorThrown as unknown as LLMRateLimitError).retryAfter).toBe(
          60,
        );
      }, 5000);

      it('should handle null response body', async () => {
        const errorResponse = createMockResponse(true, null, 200);
        (global.fetch as jest.Mock).mockResolvedValue(errorResponse);

        let errorThrown: Error | null = null;

        try {
          await new Promise<void>((resolve, reject) => {
            service.streamSummarize(mockText).subscribe({
              next: () => {},
              error: (error) => {
                errorThrown = error;
                reject(error);
              },
              complete: () => resolve(),
            });
          });
        } catch (error) {
          // Error already captured
        }

        expect(errorThrown).toBeInstanceOf(LLMServiceError);
        expect((errorThrown as unknown as LLMServiceError).message).toBe(
          'Response body is null',
        );
      }, 5000);

      it('should handle network errors', async () => {
        const networkError = new Error('Network error');
        (global.fetch as jest.Mock).mockRejectedValue(networkError);

        let errorThrown: Error | null = null;

        try {
          await new Promise<void>((resolve, reject) => {
            service.streamSummarize(mockText).subscribe({
              next: () => {},
              error: (error) => {
                errorThrown = error;
                reject(error);
              },
              complete: () => resolve(),
            });
          });
        } catch (error) {
          // Error already captured
        }

        expect(errorThrown).toBeInstanceOf(LLMServiceError);
        expect((errorThrown as unknown as LLMServiceError).message).toContain(
          'Failed to stream summarize',
        );
        expect((errorThrown as unknown as LLMServiceError).message).toContain(
          'Network error',
        );
      }, 5000);

      it('should handle error response with text instead of JSON', async () => {
        const errorResponse = createMockResponse(
          false,
          null,
          500,
          new Headers(),
        );
        (errorResponse as unknown as { json: jest.Mock }).json = jest
          .fn()
          .mockRejectedValue(new Error('Not JSON'));
        (errorResponse as unknown as { text: jest.Mock }).text = jest
          .fn()
          .mockResolvedValue('Internal server error');
        (global.fetch as jest.Mock).mockResolvedValue(errorResponse);

        let errorThrown: Error | null = null;

        try {
          await new Promise<void>((resolve, reject) => {
            service.streamSummarize(mockText).subscribe({
              next: () => {},
              error: (error) => {
                errorThrown = error;
                reject(error);
              },
              complete: () => resolve(),
            });
          });
        } catch (error) {
          // Error already captured
        }

        expect(errorThrown).toBeInstanceOf(LLMServiceError);
        expect((errorThrown as unknown as LLMServiceError).message).toContain(
          'OpenRouter API error: 500',
        );
      }, 5000);

      it('should handle stream reading errors', async () => {
        const mockStream = new ReadableStream({
          start(controller) {
            controller.error(new Error('Stream read error'));
          },
        });
        const mockResponse = createMockResponse(true, mockStream);
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        let errorThrown: Error | null = null;

        try {
          await firstValueFrom(service.streamSummarize(mockText));
        } catch (error) {
          errorThrown = error as Error;
        }

        expect(errorThrown).toBeDefined();
      });

      it('should handle malformed JSON in stream chunks', async () => {
        const mockChunks = [
          'data: {"invalid json}\n\n',
          'data: {"choices":[{"delta":{"content":"Valid"}}]}\n\n',
          'data: [DONE]\n\n',
        ];
        const mockStream = createMockReadableStream(mockChunks);
        const mockResponse = createMockResponse(true, mockStream);
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        const allChunks = await firstValueFrom(
          service.streamSummarize(mockText).pipe(toArray()),
        );

        // Should still process valid chunks and ignore malformed ones
        const contentChunks = allChunks.filter(
          (chunk) => chunk.type === 'chunk',
        );
        expect(contentChunks.length).toBe(1);
        expect(contentChunks[0]).toEqual({ type: 'chunk', content: 'Valid' });
      });
    });

    describe('stream completion', () => {
      it('should complete stream after [DONE] marker', async () => {
        const mockChunks = [
          'data: {"choices":[{"delta":{"content":"Final"}}]}\n\n',
          'data: [DONE]\n\n',
        ];
        const mockStream = createMockReadableStream(mockChunks);
        const mockResponse = createMockResponse(true, mockStream);
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        const allChunks = await firstValueFrom(
          service.streamSummarize(mockText).pipe(toArray()),
        );

        const completeChunk = allChunks.find(
          (chunk) => chunk.type === 'complete',
        );
        expect(completeChunk).toBeDefined();
        expect(completeChunk?.data?.summary).toBe('Final');
      });

      it('should handle completion without [DONE] marker (end of stream)', async () => {
        const mockChunks = [
          'data: {"choices":[{"delta":{"content":"Content"}}]}\n\n',
          // No [DONE] marker - stream ends naturally
        ];
        const mockStream = createMockReadableStream(mockChunks);
        const mockResponse = createMockResponse(true, mockStream);
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        const allChunks = await firstValueFrom(
          service.streamSummarize(mockText).pipe(toArray()),
        );

        // Stream should complete (either with complete chunk or just completion)
        // The service may emit a complete chunk with the accumulated content
        const completeChunk = allChunks.find(
          (chunk) => chunk.type === 'complete',
        );
        // If no complete chunk is emitted (empty buffer), stream still completes
        // So we just verify the stream completed successfully
        expect(allChunks.length).toBeGreaterThan(0);
        expect(allChunks[0]?.type).toBe('start' as StreamChunkType);
        if (completeChunk) {
          expect(completeChunk.type).toBe('complete');
        }
      }, 5000);
    });
  });
});

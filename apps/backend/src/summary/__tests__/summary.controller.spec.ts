import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { of, throwError } from 'rxjs';
import { SummaryController } from '../summary.controller';
import { SummaryService } from '../summary.service';
import { SummarizeRequestDto } from '../dto/summarize-request.dto';
import { StreamChunk, SummarizeResult } from '../../llm/interfaces';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

describe('SummaryController', () => {
  let controller: SummaryController;
  let summaryService: jest.Mocked<SummaryService>;
  let mockResponse: jest.Mocked<Response>;

  const mockText = 'This is a test article that needs to be summarized.';
  const mockClientIp = '127.0.0.1';
  const mockSummarizeResult: SummarizeResult = {
    summary: 'This is a summary of the text.',
    tokensUsed: 100,
    cost: 0.0015,
    model: 'gpt-3.5-turbo',
    promptTokens: 50,
    completionTokens: 50,
  };

  const createMockResponse = (): jest.Mocked<Response> => {
    const res = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      closed: false,
    } as unknown as jest.Mocked<Response>;
    return res;
  };

  beforeEach(async () => {
    // Mock SummaryService
    const mockSummaryService = {
      streamSummarize: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SummaryController],
      providers: [
        {
          provide: SummaryService,
          useValue: mockSummaryService,
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<SummaryController>(SummaryController);
    summaryService = module.get(SummaryService);
    mockResponse = createMockResponse();

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('streamSummarize', () => {
    const mockBody: SummarizeRequestDto = {
      text: mockText,
    };

    it('should set SSE headers correctly', async () => {
      const mockChunks: StreamChunk[] = [{ type: 'start' }];
      summaryService.streamSummarize.mockReturnValue(of(...mockChunks));

      await controller.streamSummarize(mockBody, mockClientIp, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-cache',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Connection',
        'keep-alive',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Accel-Buffering',
        'no',
      );
    });

    it('should call SummaryService.streamSummarize with correct parameters', async () => {
      const mockChunks: StreamChunk[] = [{ type: 'start' }];
      summaryService.streamSummarize.mockReturnValue(of(...mockChunks));

      await controller.streamSummarize(mockBody, mockClientIp, mockResponse);

      expect(summaryService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        mockClientIp,
      );
    });

    it('should not pass client IP when it is "unknown"', async () => {
      const mockChunks: StreamChunk[] = [{ type: 'start' }];
      summaryService.streamSummarize.mockReturnValue(of(...mockChunks));

      await controller.streamSummarize(mockBody, 'unknown', mockResponse);

      expect(summaryService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        undefined,
      );
    });

    it('should stream start chunk as SSE', (done) => {
      const mockChunks: StreamChunk[] = [{ type: 'start' }];
      summaryService.streamSummarize.mockReturnValue(of(...mockChunks));

      controller
        .streamSummarize(mockBody, mockClientIp, mockResponse)
        .then(() => {
          // Wait a bit for async operations
          setTimeout(() => {
            expect(mockResponse.write).toHaveBeenCalledWith(
              `data: ${JSON.stringify({ type: 'start' })}\n\n`,
            );
            done();
          }, 10);
        });
    });

    it('should stream content chunks as SSE', (done) => {
      const mockChunks: StreamChunk[] = [
        { type: 'start' },
        { type: 'chunk', content: 'This' },
        { type: 'chunk', content: ' is' },
        { type: 'chunk', content: ' a summary' },
      ];
      summaryService.streamSummarize.mockReturnValue(of(...mockChunks));

      controller
        .streamSummarize(mockBody, mockClientIp, mockResponse)
        .then(() => {
          // Wait a bit for async operations
          setTimeout(() => {
            expect(mockResponse.write).toHaveBeenCalledWith(
              `data: ${JSON.stringify({ type: 'start' })}\n\n`,
            );
            expect(mockResponse.write).toHaveBeenCalledWith(
              `data: ${JSON.stringify({ type: 'chunk', content: 'This' })}\n\n`,
            );
            expect(mockResponse.write).toHaveBeenCalledWith(
              `data: ${JSON.stringify({ type: 'chunk', content: ' is' })}\n\n`,
            );
            expect(mockResponse.write).toHaveBeenCalledWith(
              `data: ${JSON.stringify({
                type: 'chunk',
                content: ' a summary',
              })}\n\n`,
            );
            done();
          }, 50);
        });
    });

    it('should stream complete chunk as SSE', (done) => {
      const mockChunks: StreamChunk[] = [
        { type: 'start' },
        { type: 'complete', data: mockSummarizeResult },
      ];
      summaryService.streamSummarize.mockReturnValue(of(...mockChunks));

      controller
        .streamSummarize(mockBody, mockClientIp, mockResponse)
        .then(() => {
          // Wait a bit for async operations
          setTimeout(() => {
            expect(mockResponse.write).toHaveBeenCalledWith(
              `data: ${JSON.stringify({ type: 'start' })}\n\n`,
            );
            expect(mockResponse.write).toHaveBeenCalledWith(
              `data: ${JSON.stringify({
                type: 'complete',
                data: mockSummarizeResult,
              })}\n\n`,
            );
            expect(mockResponse.end).toHaveBeenCalled();
            done();
          }, 10);
        });
    });

    it('should stream error chunk as SSE', (done) => {
      const mockChunks: StreamChunk[] = [
        { type: 'start' },
        { type: 'error', error: 'Test error message' },
      ];
      summaryService.streamSummarize.mockReturnValue(of(...mockChunks));

      controller
        .streamSummarize(mockBody, mockClientIp, mockResponse)
        .then(() => {
          // Wait a bit for async operations
          setTimeout(() => {
            expect(mockResponse.write).toHaveBeenCalledWith(
              `data: ${JSON.stringify({ type: 'start' })}\n\n`,
            );
            expect(mockResponse.write).toHaveBeenCalledWith(
              `data: ${JSON.stringify({
                type: 'error',
                error: 'Test error message',
              })}\n\n`,
            );
            done();
          }, 10);
        });
    });

    it('should handle service errors and stream error chunk', (done) => {
      const error = new Error('Service error');
      summaryService.streamSummarize.mockReturnValue(throwError(() => error));

      controller
        .streamSummarize(mockBody, mockClientIp, mockResponse)
        .then(() => {
          // Wait a bit for async operations
          setTimeout(() => {
            expect(mockResponse.write).toHaveBeenCalledWith(
              `data: ${JSON.stringify({
                type: 'error',
                error: 'Service error',
              })}\n\n`,
            );
            expect(mockResponse.end).toHaveBeenCalled();
            done();
          }, 10);
        });
    });

    it('should close connection when stream completes', (done) => {
      const mockChunks: StreamChunk[] = [
        { type: 'start' },
        { type: 'complete', data: mockSummarizeResult },
      ];
      summaryService.streamSummarize.mockReturnValue(of(...mockChunks));

      controller
        .streamSummarize(mockBody, mockClientIp, mockResponse)
        .then(() => {
          // Wait a bit for async operations
          setTimeout(() => {
            expect(mockResponse.end).toHaveBeenCalled();
            done();
          }, 10);
        });
    });

    it('should not write to closed connection', (done) => {
      const mockChunks: StreamChunk[] = [
        { type: 'start' },
        { type: 'chunk', content: 'Test' },
      ];
      summaryService.streamSummarize.mockReturnValue(of(...mockChunks));
      (mockResponse as any).closed = true;

      controller
        .streamSummarize(mockBody, mockClientIp, mockResponse)
        .then(() => {
          // Wait a bit for async operations
          setTimeout(() => {
            // Should not write when connection is closed
            expect(mockResponse.write).not.toHaveBeenCalled();
            done();
          }, 10);
        });
    });

    it('should handle client disconnection cleanup', (done) => {
      const mockChunks: StreamChunk[] = [
        { type: 'start' },
        { type: 'chunk', content: 'Test' },
      ];
      const stream$ = of(...mockChunks);
      summaryService.streamSummarize.mockReturnValue(stream$);

      const originalOn = mockResponse.on;
      mockResponse.on = jest.fn(
        (event: string | symbol, callback: (...args: any[]) => void) => {
          if (event === 'close') {
            // Simulate close event
            setTimeout(() => {
              callback();
              // Verify subscription would be cleaned up
              done();
            }, 10);
          }
          return originalOn.call(mockResponse, event, callback);
        },
      );

      controller
        .streamSummarize(mockBody, mockClientIp, mockResponse)
        .then(() => {
          // Wait for close event
        });
    });

    it('should handle stream with all chunk types', (done) => {
      const mockChunks: StreamChunk[] = [
        { type: 'start' },
        { type: 'chunk', content: 'First' },
        { type: 'chunk', content: 'Second' },
        { type: 'complete', data: mockSummarizeResult },
      ];
      summaryService.streamSummarize.mockReturnValue(of(...mockChunks));

      controller
        .streamSummarize(mockBody, mockClientIp, mockResponse)
        .then(() => {
          // Wait a bit for async operations
          setTimeout(() => {
            expect(mockResponse.write).toHaveBeenCalledTimes(4);
            expect(mockResponse.write).toHaveBeenNthCalledWith(
              1,
              `data: ${JSON.stringify({ type: 'start' })}\n\n`,
            );
            expect(mockResponse.write).toHaveBeenNthCalledWith(
              2,
              `data: ${JSON.stringify({
                type: 'chunk',
                content: 'First',
              })}\n\n`,
            );
            expect(mockResponse.write).toHaveBeenNthCalledWith(
              3,
              `data: ${JSON.stringify({
                type: 'chunk',
                content: 'Second',
              })}\n\n`,
            );
            expect(mockResponse.write).toHaveBeenNthCalledWith(
              4,
              `data: ${JSON.stringify({
                type: 'complete',
                data: mockSummarizeResult,
              })}\n\n`,
            );
            expect(mockResponse.end).toHaveBeenCalled();
            done();
          }, 50);
        });
    });
  });
});

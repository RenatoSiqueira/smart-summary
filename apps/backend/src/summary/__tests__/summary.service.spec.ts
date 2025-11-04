import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { of, throwError } from 'rxjs';
import { firstValueFrom, toArray } from 'rxjs';
import { SummaryService } from '../summary.service';
import { SummaryRequest } from '../entities/summary-request.entity';
import { LLMService } from '../../llm/llm.service';
import { StreamChunk, SummarizeResult } from '../../llm/interfaces';

describe('SummaryService', () => {
  let service: SummaryService;
  let repository: jest.Mocked<Repository<SummaryRequest>>;
  let llmService: jest.Mocked<LLMService>;
  const mockText = 'This is a test article that needs to be summarized.';
  const mockClientIp = '127.0.0.1';

  const mockSummaryRequest: SummaryRequest = {
    id: 'test-id-123',
    text: mockText,
    summary: null,
    clientIp: mockClientIp,
    tokensUsed: 0,
    cost: 0,
    createdAt: new Date(),
    completedAt: null,
    error: null,
  } as SummaryRequest;

  const mockSummarizeResult: SummarizeResult = {
    summary: 'This is a summary of the text.',
    tokensUsed: 100,
    cost: 0.0015,
    model: 'gpt-3.5-turbo',
    promptTokens: 50,
    completionTokens: 50,
  };

  beforeEach(async () => {
    // Mock repository
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
    };

    // Mock LLM service
    const mockLLMService = {
      streamSummarize: jest.fn(),
      getService: jest.fn(),
      getServiceName: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryService,
        {
          provide: getRepositoryToken(SummaryRequest),
          useValue: mockRepository,
        },
        {
          provide: LLMService,
          useValue: mockLLMService,
        },
      ],
    }).compile();

    service = module.get<SummaryService>(SummaryService);
    repository = module.get(getRepositoryToken(SummaryRequest));
    llmService = module.get(LLMService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSummaryRequest', () => {
    it('should create a summary request record', async () => {
      const createdRequest = { ...mockSummaryRequest };
      repository.create.mockReturnValue(createdRequest);
      repository.save.mockResolvedValue(createdRequest);

      const result = await service.createSummaryRequest(mockText, mockClientIp);

      expect(repository.create).toHaveBeenCalledWith({
        text: mockText,
        clientIp: mockClientIp,
        tokensUsed: 0,
        cost: 0,
        summary: null,
        completedAt: null,
        error: null,
      });
      expect(repository.save).toHaveBeenCalledWith(createdRequest);
      expect(result).toEqual(createdRequest);
    });

    it('should create a summary request without client IP', async () => {
      const createdRequest = { ...mockSummaryRequest, clientIp: null };
      repository.create.mockReturnValue(createdRequest);
      repository.save.mockResolvedValue(createdRequest);

      const result = await service.createSummaryRequest(mockText);

      // Verify the call includes undefined clientIp (actual service behavior)
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: mockText,
          tokensUsed: 0,
          cost: 0,
          summary: null,
          completedAt: null,
          error: null,
        }),
      );
      // Verify clientIp is explicitly undefined if needed
      const callArgs = repository.create.mock.calls[0]?.[0];
      expect(callArgs?.clientIp).toBeUndefined();
      expect(callArgs?.error).toBeNull();
      expect(result).toEqual(createdRequest);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      repository.create.mockReturnValue(mockSummaryRequest);
      repository.save.mockRejectedValue(error);

      await expect(
        service.createSummaryRequest(mockText, mockClientIp),
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateSummaryRequest', () => {
    it('should update summary request with completion data', async () => {
      const mockUpdateResult = {
        affected: 1,
        generatedMaps: [],
        raw: undefined,
      };

      repository.update.mockResolvedValue(mockUpdateResult as any);

      const result = await service.updateSummaryRequest(
        mockSummaryRequest.id,
        mockSummarizeResult.summary,
        mockSummarizeResult.tokensUsed,
        mockSummarizeResult.cost,
        new Date(),
      );

      expect(repository.update).toHaveBeenCalledWith(
        mockSummaryRequest.id,
        expect.objectContaining({
          summary: mockSummarizeResult.summary,
          tokensUsed: mockSummarizeResult.tokensUsed,
          cost: mockSummarizeResult.cost,
          completedAt: expect.any(Date),
        }),
      );
      expect(result).toEqual(mockUpdateResult);
    });

    it('should return update result even if no rows affected', async () => {
      const mockUpdateResult = {
        affected: 0,
        generatedMaps: [],
        raw: undefined,
      };

      repository.update.mockResolvedValue(mockUpdateResult as any);

      const result = await service.updateSummaryRequest(
        mockSummaryRequest.id,
        mockSummarizeResult.summary,
        mockSummarizeResult.tokensUsed,
        mockSummarizeResult.cost,
        new Date(),
      );

      expect(repository.update).toHaveBeenCalled();
      expect(result).toEqual(mockUpdateResult);
      expect(result.affected).toBe(0);
    });
  });

  describe('streamSummarize', () => {
    it('should create database record and forward streaming chunks', async () => {
      const createdRequest = { ...mockSummaryRequest };
      const mockChunks: StreamChunk[] = [
        { type: 'start' },
        { type: 'chunk', content: 'This' },
        { type: 'chunk', content: ' is' },
        { type: 'chunk', content: ' a summary' },
        {
          type: 'complete',
          data: mockSummarizeResult,
        },
      ];

      repository.create.mockReturnValue(createdRequest);
      repository.save.mockResolvedValue(createdRequest);
      repository.update.mockResolvedValue(undefined as any);
      repository.findOne.mockResolvedValue({
        ...createdRequest,
        ...mockSummarizeResult,
        completedAt: new Date(),
      });
      llmService.streamSummarize.mockReturnValue(of(...mockChunks));

      const chunks = await firstValueFrom(
        service.streamSummarize(mockText, mockClientIp).pipe(toArray()),
      );

      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(llmService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        undefined,
      );
      expect(chunks).toHaveLength(5);
      expect(chunks[0]).toEqual({ type: 'start' });
      expect(chunks[chunks.length - 1]).toEqual({
        type: 'complete',
        data: mockSummarizeResult,
      });
    });

    it('should update database on completion', async () => {
      const createdRequest = { ...mockSummaryRequest };
      const mockChunks: StreamChunk[] = [
        { type: 'start' },
        {
          type: 'complete',
          data: mockSummarizeResult,
        },
      ];

      repository.create.mockReturnValue(createdRequest);
      repository.save.mockResolvedValue(createdRequest);
      repository.update.mockResolvedValue(undefined as any);
      repository.findOne.mockResolvedValue({
        ...createdRequest,
        summary: mockSummarizeResult.summary,
        tokensUsed: mockSummarizeResult.tokensUsed,
        cost: mockSummarizeResult.cost,
        completedAt: new Date(),
      });
      llmService.streamSummarize.mockReturnValue(of(...mockChunks));

      await firstValueFrom(
        service.streamSummarize(mockText, mockClientIp).pipe(toArray()),
      );

      // Wait a bit for async update to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(repository.update).toHaveBeenCalledWith(
        createdRequest.id,
        expect.objectContaining({
          summary: mockSummarizeResult.summary,
          tokensUsed: mockSummarizeResult.tokensUsed,
          cost: mockSummarizeResult.cost,
          completedAt: expect.any(Date),
        }),
      );
    });

    it('should handle LLM service errors', async () => {
      const createdRequest = { ...mockSummaryRequest };
      const error = new Error('LLM service error');

      repository.create.mockReturnValue(createdRequest);
      repository.save.mockResolvedValue(createdRequest);
      repository.update.mockResolvedValue(undefined as any);
      llmService.streamSummarize.mockReturnValue(throwError(() => error));

      const chunks: StreamChunk[] = [];
      let caughtError: Error | null = null;

      try {
        await new Promise<void>((resolve, reject) => {
          service.streamSummarize(mockText, mockClientIp).subscribe({
            next: (chunk) => {
              chunks.push(chunk);
            },
            error: (err) => {
              caughtError = err as Error;
              reject(err);
            },
            complete: () => {
              resolve();
            },
          });
        });
      } catch (err) {
        // Error already captured in caughtError
      }

      // Wait for async error handling to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify error chunk was emitted BEFORE error is thrown
      const errorChunk = chunks.find((c) => c.type === 'error');
      expect(errorChunk).toBeDefined();
      expect(errorChunk?.error).toBe('LLM service error');

      // Verify error was thrown to subscriber
      expect(caughtError).toBeDefined();
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toBe('LLM service error');

      // Verify database was updated with error information
      expect(repository.update).toHaveBeenCalledWith(
        createdRequest.id,
        expect.objectContaining({
          error: 'LLM service error',
          completedAt: expect.any(Date),
        }),
      );
    });

    it('should handle database creation errors', async () => {
      const error = new Error('Database creation error');
      repository.create.mockReturnValue(mockSummaryRequest);
      repository.save.mockRejectedValue(error);

      const chunks: StreamChunk[] = [];
      let caughtError: Error | null = null;

      try {
        await new Promise<void>((resolve, reject) => {
          service.streamSummarize(mockText, mockClientIp).subscribe({
            next: (chunk) => {
              chunks.push(chunk);
            },
            error: (err) => {
              caughtError = err as Error;
              reject(err);
            },
            complete: () => {
              resolve();
            },
          });
        });
      } catch (err) {
        // Error already captured in caughtError
      }

      // Verify error chunk was emitted with original error message
      const errorChunk = chunks.find((c) => c.type === 'error');
      expect(errorChunk).toBeDefined();
      expect(errorChunk?.error).toBe('Database creation error');

      // Verify error was thrown with full message including prefix
      expect(caughtError).toBeDefined();
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toBe(
        'Failed to create summary request: Database creation error',
      );
    });

    it('should forward all chunk types correctly', async () => {
      const createdRequest = { ...mockSummaryRequest };
      const mockChunks: StreamChunk[] = [
        { type: 'start' },
        { type: 'chunk', content: 'Part' },
        { type: 'chunk', content: ' 1' },
        { type: 'chunk', content: 'Part' },
        { type: 'chunk', content: ' 2' },
        {
          type: 'complete',
          data: mockSummarizeResult,
        },
      ];

      repository.create.mockReturnValue(createdRequest);
      repository.save.mockResolvedValue(createdRequest);
      repository.update.mockResolvedValue(undefined as any);
      repository.findOne.mockResolvedValue(createdRequest);
      llmService.streamSummarize.mockReturnValue(of(...mockChunks));

      const chunks = await firstValueFrom(
        service.streamSummarize(mockText).pipe(toArray()),
      );

      expect(chunks).toHaveLength(6);
      expect(chunks.filter((c) => c.type === 'start')).toHaveLength(1);
      expect(chunks.filter((c) => c.type === 'chunk')).toHaveLength(4);
      expect(chunks.filter((c) => c.type === 'complete')).toHaveLength(1);
    });

    it('should pass options to LLM service', async () => {
      const createdRequest = { ...mockSummaryRequest };
      const options = { model: 'gpt-4', maxTokens: 1000 };
      const mockChunks: StreamChunk[] = [
        { type: 'start' },
        { type: 'complete', data: mockSummarizeResult },
      ];

      repository.create.mockReturnValue(createdRequest);
      repository.save.mockResolvedValue(createdRequest);
      repository.update.mockResolvedValue(undefined as any);
      repository.findOne.mockResolvedValue(createdRequest);
      llmService.streamSummarize.mockReturnValue(of(...mockChunks));

      await firstValueFrom(
        service
          .streamSummarize(mockText, mockClientIp, options)
          .pipe(toArray()),
      );

      expect(llmService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        options,
      );
    });

    it('should handle database update errors gracefully', async () => {
      const createdRequest = { ...mockSummaryRequest };
      const mockChunks: StreamChunk[] = [
        { type: 'start' },
        {
          type: 'complete',
          data: mockSummarizeResult,
        },
      ];

      const updateError = new Error('Update error');
      repository.create.mockReturnValue(createdRequest);
      repository.save.mockResolvedValue(createdRequest);
      repository.update.mockRejectedValue(updateError);
      repository.findOne.mockResolvedValue(createdRequest);
      llmService.streamSummarize.mockReturnValue(of(...mockChunks));

      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      const chunks = await firstValueFrom(
        service.streamSummarize(mockText).pipe(toArray()),
      );

      // Wait for async update to complete (properly wait)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify stream completes successfully
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual({ type: 'start' });
      expect(chunks[1]).toEqual({
        type: 'complete',
        data: mockSummarizeResult,
      });

      // Verify error was logged with correct format
      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to update summary request ${createdRequest.id}:`,
        updateError,
      );

      loggerSpy.mockRestore();
    }, 10000);
  });

  describe('handleError', () => {
    it('should update database with error information', async () => {
      const requestId = 'test-id-123';
      const error = new Error('Test error message');

      repository.update.mockResolvedValue(undefined as any);
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      // Use reflection to access private method for testing
      await (service as any).handleError(requestId, error);

      // Verify error was logged with context
      expect(loggerSpy).toHaveBeenCalledWith(
        `Summary request ${requestId} failed:`,
        expect.objectContaining({
          requestId,
          errorType: 'Error',
          errorMessage: 'Test error message',
        }),
      );

      // Verify database was updated with error information
      expect(repository.update).toHaveBeenCalledWith(
        requestId,
        expect.objectContaining({
          error: 'Test error message',
          completedAt: expect.any(Date),
        }),
      );

      loggerSpy.mockRestore();
    });

    it('should handle string errors', async () => {
      const requestId = 'test-id-123';
      const error = 'String error message';

      repository.update.mockResolvedValue(undefined as any);
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await (service as any).handleError(requestId, error);

      expect(repository.update).toHaveBeenCalledWith(
        requestId,
        expect.objectContaining({
          error: 'String error message',
          completedAt: expect.any(Date),
        }),
      );

      loggerSpy.mockRestore();
    });

    it('should handle unknown error types', async () => {
      const requestId = 'test-id-123';
      const error = { code: 500, message: 'Unknown error' };

      repository.update.mockResolvedValue(undefined as any);
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await (service as any).handleError(requestId, error);

      // Should JSON.stringify unknown error types
      expect(repository.update).toHaveBeenCalledWith(
        requestId,
        expect.objectContaining({
          error: expect.stringContaining('code'),
          completedAt: expect.any(Date),
        }),
      );

      loggerSpy.mockRestore();
    });

    it('should handle update failures gracefully', async () => {
      const requestId = 'test-id-123';
      const error = new Error('Test error');
      const updateError = new Error('Database update failed');

      repository.update.mockRejectedValue(updateError);
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await (service as any).handleError(requestId, error);

      // Should log the update failure
      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to update error info for request ${requestId}:`,
        updateError,
      );

      loggerSpy.mockRestore();
    });

    it('should extract error type correctly', async () => {
      const requestId = 'test-id-123';
      const error = new TypeError('Type error');

      repository.update.mockResolvedValue(undefined as any);
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await (service as any).handleError(requestId, error);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Summary request ${requestId} failed:`,
        expect.objectContaining({
          errorType: 'TypeError',
          errorMessage: 'Type error',
        }),
      );

      loggerSpy.mockRestore();
    });
  });

  describe('getSummaryRequest', () => {
    it('should get summary request by ID', async () => {
      repository.findOne.mockResolvedValue(mockSummaryRequest);

      const result = await service.getSummaryRequest(mockSummaryRequest.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockSummaryRequest.id },
      });
      expect(result).toEqual(mockSummaryRequest);
    });

    it('should return null if request not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.getSummaryRequest('non-existent-id');

      expect(result).toBeNull();
    });
  });
});

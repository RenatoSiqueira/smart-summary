import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { of, throwError, firstValueFrom } from 'rxjs';
import { LLMService } from '../llm.service';
import { OpenRouterService } from '../openrouter.service';
import { OpenAIService } from '../openai.service';
import { StreamChunk, LLMServiceError, LLMRateLimitError } from '../interfaces';
import { AppConfig } from '../../config/config.interface';

describe('LLMService', () => {
  let service: LLMService;
  let openRouterService: jest.Mocked<OpenRouterService>;
  let openAIService: jest.Mocked<OpenAIService>;
  let configService: jest.Mocked<ConfigService<{ app: AppConfig }>>;

  const mockText = 'This is a test article that needs to be summarized.';
  const mockChunks: StreamChunk[] = [
    { type: 'start' },
    { type: 'chunk', content: 'Summary' },
    {
      type: 'complete',
      data: {
        summary: 'Summary',
        tokensUsed: 100,
        cost: 0.0015,
        model: 'gpt-3.5-turbo',
        promptTokens: 50,
        completionTokens: 50,
      },
    },
  ];

  beforeEach(async () => {
    // Mock services
    const mockOpenRouterService = {
      streamSummarize: jest.fn(),
    };

    const mockOpenAIService = {
      streamSummarize: jest.fn(),
    };

    // Mock ConfigService
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LLMService,
        {
          provide: OpenRouterService,
          useValue: mockOpenRouterService,
        },
        {
          provide: OpenAIService,
          useValue: mockOpenAIService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<LLMService>(LLMService);
    openRouterService = module.get(OpenRouterService);
    openAIService = module.get(OpenAIService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('streamSummarize with fallback', () => {
    it('should use OpenRouter when both services are available', async () => {
      openRouterService.streamSummarize.mockReturnValue(of(...mockChunks));

      await firstValueFrom(service.streamSummarize(mockText));

      expect(openRouterService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        undefined,
      );
      expect(openAIService.streamSummarize).not.toHaveBeenCalled();
    });

    it('should fallback to OpenAI when OpenRouter fails', async () => {
      const error = new LLMServiceError('OpenRouter API error');
      openRouterService.streamSummarize.mockReturnValue(
        throwError(() => error),
      );
      openAIService.streamSummarize.mockReturnValue(of(...mockChunks));

      await firstValueFrom(service.streamSummarize(mockText));

      expect(openRouterService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        undefined,
      );
      expect(openAIService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        undefined,
      );
    });

    it('should not retry on rate limit errors', async () => {
      const rateLimitError = new LLMRateLimitError('Rate limit exceeded');
      openRouterService.streamSummarize.mockReturnValue(
        throwError(() => rateLimitError),
      );

      await expect(
        firstValueFrom(service.streamSummarize(mockText)),
      ).rejects.toThrow('Rate limit exceeded');

      expect(openRouterService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        undefined,
      );
      expect(openAIService.streamSummarize).not.toHaveBeenCalled();
    });

    it('should throw error when both services fail', async () => {
      const error = new LLMServiceError('OpenRouter API error');
      const fallbackError = new LLMServiceError('OpenAI API error');
      openRouterService.streamSummarize.mockReturnValue(
        throwError(() => error),
      );
      openAIService.streamSummarize.mockReturnValue(
        throwError(() => fallbackError),
      );

      await expect(
        firstValueFrom(service.streamSummarize(mockText)),
      ).rejects.toThrow('OpenAI API error');

      expect(openRouterService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        undefined,
      );
      expect(openAIService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        undefined,
      );
    });

    it('should throw error when OpenRouter fails and no fallback available', async () => {
      // Create a module without OpenAI service
      const moduleWithoutOpenAI = await Test.createTestingModule({
        providers: [
          LLMService,
          {
            provide: OpenRouterService,
            useValue: openRouterService,
          },
          {
            provide: OpenAIService,
            useValue: null,
          },
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const serviceWithoutFallback =
        moduleWithoutOpenAI.get<LLMService>(LLMService);

      const error = new LLMServiceError('OpenRouter API error');
      openRouterService.streamSummarize.mockReturnValue(
        throwError(() => error),
      );

      await expect(
        firstValueFrom(serviceWithoutFallback.streamSummarize(mockText)),
      ).rejects.toThrow('OpenRouter API error');

      expect(openRouterService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        undefined,
      );
    });

    it('should use OpenAI directly when OpenRouter is not available', async () => {
      // Create a module without OpenRouter service
      const moduleWithoutOpenRouter = await Test.createTestingModule({
        providers: [
          LLMService,
          {
            provide: OpenRouterService,
            useValue: null,
          },
          {
            provide: OpenAIService,
            useValue: openAIService,
          },
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const serviceWithoutOpenRouter =
        moduleWithoutOpenRouter.get<LLMService>(LLMService);

      openAIService.streamSummarize.mockReturnValue(of(...mockChunks));

      await firstValueFrom(serviceWithoutOpenRouter.streamSummarize(mockText));

      expect(openAIService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        undefined,
      );
      expect(openRouterService.streamSummarize).not.toHaveBeenCalled();
    });

    it('should throw error when no services are available', () => {
      // Create a module without any services
      Test.createTestingModule({
        providers: [
          LLMService,
          {
            provide: OpenRouterService,
            useValue: null,
          },
          {
            provide: OpenAIService,
            useValue: null,
          },
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      })
        .compile()
        .then((module) => {
          const serviceWithoutServices = module.get<LLMService>(LLMService);

          expect(() => {
            serviceWithoutServices.streamSummarize(mockText);
          }).toThrow(
            'No LLM service is available. Please configure either OPENROUTER_API_KEY or OPENAI_API_KEY',
          );
        });
    });

    it('should pass options to the primary service', async () => {
      const options = { model: 'gpt-4', maxTokens: 1000 };
      openRouterService.streamSummarize.mockReturnValue(of(...mockChunks));

      await firstValueFrom(service.streamSummarize(mockText, options));

      expect(openRouterService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        options,
      );
    });

    it('should pass options to fallback service when primary fails', async () => {
      const options = { model: 'gpt-4', maxTokens: 1000 };
      const error = new LLMServiceError('OpenRouter API error');
      openRouterService.streamSummarize.mockReturnValue(
        throwError(() => error),
      );
      openAIService.streamSummarize.mockReturnValue(of(...mockChunks));

      await firstValueFrom(service.streamSummarize(mockText, options));

      expect(openRouterService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        options,
      );
      expect(openAIService.streamSummarize).toHaveBeenCalledWith(
        mockText,
        options,
      );
    });
  });

  describe('getService', () => {
    it('should return OpenRouter service when available', () => {
      const result = service.getService();
      expect(result).toBe(openRouterService);
    });
  });

  describe('getServiceName', () => {
    it('should return "OpenRouter" when OpenRouter is available', () => {
      const name = service.getServiceName();
      expect(name).toBe('OpenRouter');
    });
  });
});

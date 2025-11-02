import {
  Injectable,
  OnModuleInit,
  Optional,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  ILLMService,
  SummarizeOptions,
  StreamChunk,
  LLMRateLimitError,
} from './interfaces';
import { OpenRouterService } from './openrouter.service';
import { OpenAIService } from './openai.service';

@Injectable()
export class LLMService implements ILLMService, OnModuleInit {
  private readonly logger = new Logger(LLMService.name);

  constructor(
    @Optional()
    @Inject(OpenRouterService)
    private readonly openRouterService: OpenRouterService | null,
    @Optional()
    @Inject(OpenAIService)
    private readonly openAIService: OpenAIService | null,
  ) {}

  onModuleInit() {
    if (this.openRouterService) {
      this.logger.log('OpenRouter service available (primary)');
    }
    if (this.openAIService) {
      this.logger.log('OpenAI service available (fallback)');
    }
    if (!this.openRouterService && !this.openAIService) {
      this.logger.warn(
        'No LLM service is available. Please configure either OPENROUTER_API_KEY or OPENAI_API_KEY',
      );
    }
  }

  getService(): ILLMService {
    if (this.openRouterService) {
      return this.openRouterService;
    }
    if (this.openAIService) {
      return this.openAIService;
    }
    throw new Error(
      'No LLM service is available. Please configure either OPENROUTER_API_KEY or OPENAI_API_KEY',
    );
  }

  getServiceName(): string {
    if (this.openRouterService) {
      return 'OpenRouter';
    }
    if (this.openAIService) {
      return 'OpenAI';
    }
    return 'None';
  }

  /**
   * Summarize text using LLM service with automatic fallback
   * Tries OpenRouter first, then falls back to OpenAI if OpenRouter fails
   * Does not retry on rate limits (failures only)
   *
   * @param text Text to summarize
   * @param options Optional summarization options
   * @returns Observable stream of chunks
   */
  streamSummarize(
    text: string,
    options?: SummarizeOptions,
  ): Observable<StreamChunk> {
    if (this.openRouterService) {
      return this.openRouterService.streamSummarize(text, options).pipe(
        catchError((error) => {
          if (error instanceof LLMRateLimitError) {
            this.logger.warn(
              'OpenRouter rate limit exceeded, not retrying with fallback',
            );
            return throwError(() => error);
          }

          this.logger.warn(
            `OpenRouter request failed, attempting fallback to OpenAI: ${error.message}`,
          );

          if (this.openAIService) {
            this.logger.log('Retrying with OpenAI service');
            return this.openAIService.streamSummarize(text, options).pipe(
              catchError((fallbackError) => {
                this.logger.error(
                  `Both OpenRouter and OpenAI services failed. Last error: ${fallbackError.message}`,
                );
                return throwError(() => fallbackError);
              }),
            );
          }

          this.logger.error(
            `OpenRouter failed and no OpenAI fallback available: ${error.message}`,
          );
          return throwError(() => error);
        }),
      );
    }

    if (this.openAIService) {
      this.logger.log('Using OpenAI service (OpenRouter not configured)');
      return this.openAIService.streamSummarize(text, options);
    }

    throw new Error(
      'No LLM service is available. Please configure either OPENROUTER_API_KEY or OPENAI_API_KEY',
    );
  }
}

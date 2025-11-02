import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseLLMService } from './base-llm.service';
import { AppConfig } from '../config/config.interface';

const OPENAI_API_URL = 'https://api.openai.com/v1';

@Injectable()
export class OpenAIService extends BaseLLMService {
  constructor(configService: ConfigService<{ app: AppConfig }>) {
    const llmConfig = configService.get<AppConfig>('app')?.llm;
    if (!llmConfig?.openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    super(configService, llmConfig.openaiApiKey, OPENAI_API_URL);
  }

  protected getDefaultModel(): string {
    return (
      this.configService.get<AppConfig>('app')?.llm?.openaiDefaultModel ??
      'gpt-3.5-turbo'
    );
  }

  protected calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): number {
    let promptPricePer1K = 0.0005; // $0.0005 per 1K tokens for gpt-3.5-turbo
    let completionPricePer1K = 0.0015; // $0.0015 per 1K tokens for gpt-3.5-turbo

    if (model.includes('gpt-4-turbo')) {
      promptPricePer1K = 0.01; // $0.01 per 1K tokens
      completionPricePer1K = 0.03; // $0.03 per 1K tokens
    } else if (model.includes('gpt-4')) {
      promptPricePer1K = 0.03; // $0.03 per 1K tokens
      completionPricePer1K = 0.06; // $0.06 per 1K tokens
    } else if (model.includes('gpt-3.5-turbo')) {
      promptPricePer1K = 0.0005; // $0.0005 per 1K tokens
      completionPricePer1K = 0.0015; // $0.0015 per 1K tokens
    }

    const promptCost = (promptTokens / 1000) * promptPricePer1K;
    const completionCost = (completionTokens / 1000) * completionPricePer1K;

    return promptCost + completionCost;
  }

  protected getApiErrorMessage(statusCode: number): string {
    return `OpenAI API error: ${statusCode}`;
  }
}

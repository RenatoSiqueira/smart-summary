import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseLLMService } from './base-llm.service';
import { AppConfig } from '../config/config.interface';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

@Injectable()
export class OpenRouterService extends BaseLLMService {
  constructor(configService: ConfigService<{ app: AppConfig }>) {
    const llmConfig = configService.get<AppConfig>('app')?.llm;
    if (!llmConfig?.openrouterApiKey) {
      throw new Error('OpenRouter API key is not configured');
    }
    super(configService, llmConfig.openrouterApiKey, OPENROUTER_API_URL);
  }

  protected getDefaultModel(): string {
    return (
      this.configService.get<AppConfig>('app')?.llm?.openrouterDefaultModel ??
      'openai/gpt-3.5-turbo'
    );
  }

  protected buildRequestHeaders(): Record<string, string> {
    return {
      ...super.buildRequestHeaders(),
      'HTTP-Referer': 'https://smart-summary-app.com',
      'X-Title': 'Smart Summary App',
    };
  }

  protected calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): number {
    // Simplified pricing (per 1K tokens)
    // These are approximate values and should be updated with actual OpenRouter pricing
    let promptPricePer1K = 0.0015; // $0.0015 per 1K tokens
    let completionPricePer1K = 0.002; // $0.002 per 1K tokens

    if (model.includes('gpt-4')) {
      promptPricePer1K = 0.03;
      completionPricePer1K = 0.06;
    } else if (model.includes('mistralai/mistral-nemo')) {
      promptPricePer1K = 0.02;
      completionPricePer1K = 0.04;
    }

    const promptCost = (promptTokens / 1000) * promptPricePer1K;
    const completionCost = (completionTokens / 1000) * completionPricePer1K;

    return promptCost + completionCost;
  }

  protected getApiErrorMessage(statusCode: number): string {
    return `OpenRouter API error: ${statusCode}`;
  }
}

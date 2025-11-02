import { Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LLMService } from './llm.service';
import { OpenRouterService } from './openrouter.service';
import { OpenAIService } from './openai.service';
import { AppConfig } from '../config/config.interface';

const openRouterServiceFactory: Provider = {
  provide: OpenRouterService,
  useFactory: (configService: ConfigService<{ app: AppConfig }>) => {
    const llmConfig = configService.get<AppConfig>('app')?.llm;
    if (!llmConfig?.openrouterApiKey) {
      return null;
    }
    try {
      return new OpenRouterService(configService);
    } catch (error) {
      return null;
    }
  },
  inject: [ConfigService],
};

const openAIServiceFactory: Provider = {
  provide: OpenAIService,
  useFactory: (configService: ConfigService<{ app: AppConfig }>) => {
    const llmConfig = configService.get<AppConfig>('app')?.llm;
    if (!llmConfig?.openaiApiKey) {
      return null;
    }
    try {
      return new OpenAIService(configService);
    } catch (error) {
      return null;
    }
  },
  inject: [ConfigService],
};

@Module({
  imports: [ConfigModule],
  providers: [openRouterServiceFactory, openAIServiceFactory, LLMService],
  exports: [LLMService, OpenRouterService, OpenAIService],
})
export class LLMModule {}

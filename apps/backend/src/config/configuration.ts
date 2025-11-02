import { registerAs } from '@nestjs/config';
import { AppConfig } from './config.interface';
import { Environment } from './env.validation';

export default registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT || '3000', 10),
    environment:
      (process.env.NODE_ENV as Environment) || Environment.Development,
    database: {
      url: process.env.DATABASE_URL || '',
    },
    llm: {
      openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
      openaiApiKey: process.env.OPENAI_API_KEY,
      openrouterDefaultModel: process.env.OPENROUTER_DEFAULT_MODEL || '',
      openaiDefaultModel: process.env.OPENAI_DEFAULT_MODEL || '',
    },
    apiKey: process.env.API_KEY || '',
  }),
);

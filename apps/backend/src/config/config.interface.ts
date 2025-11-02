import { Environment } from './env.validation';

export interface DatabaseConfig {
  url: string;
}

export interface LLMConfig {
  openrouterApiKey: string;
  openaiApiKey?: string;
  openrouterDefaultModel: string;
  openaiDefaultModel: string;
}

export interface AppConfig {
  port: number;
  environment: Environment;
  database: DatabaseConfig;
  llm: LLMConfig;
  apiKey: string;
}

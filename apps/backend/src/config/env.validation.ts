import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  validateSync,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  OPENROUTER_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  OPENROUTER_DEFAULT_MODEL: string;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @ValidateIf((o) => o.OPENAI_API_KEY !== undefined)
  @IsString()
  @IsNotEmpty()
  OPENAI_DEFAULT_MODEL?: string;

  @IsString()
  @IsNotEmpty()
  API_KEY: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}

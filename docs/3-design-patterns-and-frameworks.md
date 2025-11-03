# Design Patterns and Frameworks

## Overview

This document describes the design patterns, architectural decisions, and framework usage throughout the Smart Summary App codebase.

## Design Patterns

### 1. Dependency Injection (DI)

**Implementation**: NestJS built-in DI container

The application extensively uses NestJS's dependency injection system for loose coupling and testability.

**Example**: Controllers and services inject dependencies via constructor:

```1:20:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/summary/summary.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';
import { SummaryRequest } from '../database/entities/summary-request.entity';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SummaryRequest]),
    LLMModule,
    ConfigModule,
  ],
  controllers: [SummaryController],
  providers: [SummaryService],
  exports: [SummaryService],
})
export class SummaryModule {}
```

**Benefits**:

- Easy to mock dependencies for testing
- Clear dependency graph
- Singleton instance management by NestJS

### 2. Repository Pattern

**Implementation**: TypeORM repositories

Data access is abstracted through TypeORM repositories, providing a clean interface for database operations.

**Example**: SummaryService injects repository:

```1:20:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/summary/summary.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { Observable } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';
import { LLMService } from '../llm/llm.service';
import { SummaryRequest } from './entities/summary-request.entity';
import { StreamChunk, SummarizeOptions } from '../llm/interfaces';

@Injectable()
export class SummaryService {
  constructor(
    @InjectRepository(SummaryRequest)
    private readonly summaryRequestRepository: Repository<SummaryRequest>,
    private readonly llmService: LLMService,
  ) {}
```

**Benefits**:

- Decouples business logic from database implementation
- Easy to swap database providers
- Built-in query builder for complex queries

### 3. Strategy Pattern

**Implementation**: LLM Provider Strategy

Different LLM providers (OpenRouter, OpenAI) implement the same interface (`ILLMService`), allowing runtime selection.

**Example**: Base class defines contract, implementations provide specifics:

```1:61:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/llm/openrouter.service.ts
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
```

**Benefits**:

- Easy to add new LLM providers
- Runtime provider selection
- Consistent interface across providers

### 4. Factory Pattern

**Implementation**: LLM Provider Factory

Providers are created via factory functions that handle configuration validation:

```1:46:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/llm/llm.module.ts
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
```

**Benefits**:

- Optional provider creation (returns `null` if not configured)
- Centralized configuration validation
- Graceful degradation when providers unavailable

### 5. Template Method Pattern

**Implementation**: BaseLLMService

Base class defines algorithm skeleton, subclasses override specific steps:

```1:360:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/llm/base-llm.service.ts
export abstract class BaseLLMService implements ILLMService {
  // Template method - defines overall flow
  streamSummarize(text: string, options?: SummarizeOptions): Observable<StreamChunk> {
    // Common logic: build messages, make request, process stream
    // Specific steps delegated to abstract methods
  }

  // Abstract methods - must be implemented by subclasses
  protected abstract getDefaultModel(): string;
  protected abstract calculateCost(...): number;
  protected abstract getApiErrorMessage(statusCode: number): string;

  // Hook methods - can be overridden
  protected buildRequestHeaders(): Record<string, string> {
    // Default implementation
  }
}
```

**Benefits**:

- Code reuse across providers
- Consistent behavior with provider-specific customization
- Easy to extend with new providers

### 6. Observer Pattern (Reactive Streams)

**Implementation**: RxJS Observables

Streaming responses use RxJS Observable pattern for reactive data flow:

```1:164:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/summary/summary.service.ts
streamSummarize(
  text: string,
  clientIp?: string,
  options?: SummarizeOptions,
): Observable<StreamChunk> {
  return new Observable<StreamChunk>((subscriber) => {
    // Subscribe to LLM service stream
    this.llmService
      .streamSummarize(text, options)
      .pipe(
        map((chunk: StreamChunk) => chunk),
        catchError((error) => {
          // Error handling
        }),
        finalize(async () => {}),
      )
      .subscribe({
        next: (chunk: StreamChunk) => {
          subscriber.next(chunk);
          // Update database on completion
        },
        error: (error) => subscriber.error(error),
        complete: () => subscriber.complete(),
      });
  });
}
```

**Benefits**:

- Non-blocking async operations
- Composability with RxJS operators
- Clean error propagation

### 7. Guard Pattern

**Implementation**: NestJS Guards

API key validation handled via guard:

```1:44:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/common/guards/api-key.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AppConfig } from '../../config/config.interface';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService<{ app: AppConfig }>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    const validApiKey = this.configService.get<AppConfig>('app')?.apiKey;

    if (!validApiKey) {
      throw new UnauthorizedException('API key validation is not configured');
    }

    if (apiKey !== validApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  private extractApiKey(request: Request): string {
    const headerKey = request.headers['x-api-key'];

    if (headerKey && typeof headerKey === 'string') {
      return headerKey;
    }

    throw new UnauthorizedException('API key is missing');
  }
}
```

**Benefits**:

- Reusable authentication logic
- Declarative application via decorators
- Easy to test and mock

### 8. Decorator Pattern

**Implementation**: NestJS Decorators

Extensive use of decorators for metadata and behavior:

- `@Controller()` - Route definitions
- `@Injectable()` - Service registration
- `@UseGuards()` - Authentication/authorization
- `@InjectRepository()` - Repository injection
- `@ClientIp()` - Custom parameter extraction

**Example**:

```1:111:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/summary/summary.controller.ts
@Controller('summary')
@UseGuards(ApiKeyGuard)
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async streamSummarize(
    @Body() body: SummarizeRequestDto,
    @ClientIp() clientIp: string,
    @Res() res: Response,
  ): Promise<void> {
    // Implementation
  }
}
```

**Benefits**:

- Clean, declarative code
- Separation of concerns (routing, validation, auth)
- Framework handles boilerplate

## Framework-Specific Patterns

### NestJS Patterns

#### Module Pattern

- Feature-based modules (`SummaryModule`, `AnalyticsModule`)
- Shared modules (`DatabaseModule`, `LLMModule`)
- Global modules (`ConfigModule`)

#### Validation Pipeline

- DTO classes with decorators (`class-validator`)
- Global validation pipe in `main.ts`
- Automatic transformation (`class-transformer`)

#### Exception Filters

- Built-in HTTP exception handling
- Custom exceptions for business logic errors
- Error transformation for client responses

### Next.js Patterns

#### Server Components vs Client Components

- Default: Server Components (rendered on server)
- Client Components: `'use client'` directive for interactivity

#### Server Actions

- `'use server'` directive for server-side functions
- Type-safe server-side data fetching
- Automatic request/response serialization

**Example**:

```1:50:/home/renato-siqueira/Projects/Smart-Summary-App/apps/frontend/src/app/analytics/actions/get-analytics.action.ts
'use server';

import { fetchFromBackend, getApiKey } from '@/shared/lib/http-client';
import type { AnalyticsMetrics } from '@smart-summary/types';

export async function getAnalyticsAction(filters?: {
  startDate?: Date | string;
  endDate?: Date | string;
  clientIp?: string;
}): Promise<{ success: boolean; data?: AnalyticsMetrics; error?: string }> {
  // Server-side implementation
}
```

#### API Routes

- Custom endpoints for complex operations (SSE streaming)
- Route handlers in `route.ts` files
- Server-side only (API keys never exposed)

### React Patterns

#### Custom Hooks

- Encapsulate business logic (`useStreamingSummary`)
- Reusable state management
- Clean component code

**Example**:

```1:167:/home/renato-siqueira/Projects/Smart-Summary-App/apps/frontend/src/app/summarize/hooks/useStreamingSummary.ts
export function useStreamingSummary(
  options: UseStreamingSummaryOptions = {},
): UseStreamingSummaryReturn {
  // Hook implementation with state management
}
```

#### Component Composition

- Small, focused components
- Props-based data flow
- Shared UI components in `shared/components`

## Architectural Decisions

### Why NestJS?

1. **TypeScript-First**: Excellent TypeScript support out of the box
2. **Modular Architecture**: Built-in module system promotes organization
3. **Dependency Injection**: Enterprise-grade DI container
4. **Decorators**: Clean, declarative API definitions
5. **Testability**: Built-in testing utilities and mocking support

### Why Next.js App Router?

1. **Modern React**: Latest React features (Server Components, Server Actions)
2. **Performance**: Built-in optimizations (automatic code splitting, image optimization)
3. **Developer Experience**: Excellent TypeScript support, fast refresh
4. **SEO**: Server-side rendering capabilities
5. **Deployment**: Excellent deployment options (Vercel, self-hosted)

### Why TypeORM?

1. **TypeScript Support**: First-class TypeScript integration
2. **Active Record/Repository**: Flexible data access patterns
3. **Migrations**: Version-controlled database schema changes
4. **Query Builder**: Powerful query construction for analytics
5. **Relationships**: Easy to model complex relationships (when needed)

### Why RxJS for Streaming?

1. **Observable Pattern**: Perfect for async streams
2. **Operator Composition**: Powerful data transformation
3. **Error Handling**: Built-in error propagation
4. **Backpressure**: Handles rate limiting gracefully

### Why SSE over WebSockets?

1. **Simplicity**: One-way streaming doesn't need bidirectional protocol
2. **HTTP-Based**: Works through proxies, firewalls easily
3. **Built-in Reconnection**: Automatic reconnection on connection loss
4. **Server Push**: Standard HTTP-based server push mechanism

## Design Principles

### SOLID Principles

1. **Single Responsibility**: Each service/component has one clear purpose
2. **Open/Closed**: Extensible via inheritance (BaseLLMService) and interfaces
3. **Liskov Substitution**: All LLM providers implement same interface
4. **Interface Segregation**: Focused interfaces (ILLMService, ILLMProvider)
5. **Dependency Inversion**: Depend on abstractions (ILLMService) not concretions

### Clean Code Practices

- **Meaningful Names**: Clear, descriptive variable and function names
- **Small Functions**: Functions do one thing well
- **Error Handling**: Comprehensive error handling at each layer
- **Type Safety**: Extensive use of TypeScript for compile-time safety
- **Documentation**: Inline comments for complex logic

## Assumptions and Trade-offs

### Assumptions

1. **Provider Availability**: At least one LLM provider configured
2. **Database Reliability**: PostgreSQL is reliable and available
3. **Network Stability**: Network connections are generally stable (handled with retries where appropriate)
4. **API Key Security**: API keys managed securely via environment variables

### Trade-offs

1. **SSE vs WebSockets**: Chose SSE for simplicity, but WebSockets would enable bidirectional communication
2. **Optional Providers**: Factory returns `null` when not configured - requires runtime null checks
3. **Synchronous Processing**: No queue system means blocking on LLM calls (acceptable for current scale)
4. **Single API Key**: Shared key for all requests - simple but no per-user authentication

# Modules & Class Details

## Overview

This document provides a detailed breakdown of modules, classes, and components in the Smart Summary App, organized by backend and frontend sections.

## Backend Modules

### SummaryModule

**Purpose**: Handles summarization requests and streaming responses.

**Location**: `apps/backend/src/summary/`

**Components**:

#### SummaryController

**Path**: `apps/backend/src/summary/summary.controller.ts`

**Responsibilities**:

- Accepts POST requests to `/api/summary`
- Validates API key via `ApiKeyGuard`
- Streams summaries via Server-Sent Events (SSE)
- Formats SSE responses

**Key Methods**:

```1:111:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/summary/summary.controller.ts
@Controller('summary')
@UseGuards(ApiKeyGuard)
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  /**
   * POST /api/summary
   * Stream summarize text using Server-Sent Events (SSE)
   *
   * @param body Request body containing text to summarize
   * @param clientIp Client IP address (extracted from request headers)
   * @param res Express Response object for SSE streaming
   * @returns SSE stream of summary chunks
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async streamSummarize(
    @Body() body: SummarizeRequestDto,
    @ClientIp() clientIp: string,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const stream$: Observable<StreamChunk> =
      this.summaryService.streamSummarize(
        body.text,
        clientIp !== 'unknown' ? clientIp : undefined,
      );

    let subscription: Subscription | null = null;

    res.on('close', () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });

    subscription = stream$
      .pipe(
        map((chunk: StreamChunk) => {
          return this.formatSSE(chunk);
        }),
        catchError((error) => {
          const errorChunk: StreamChunk = {
            type: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'An unexpected error occurred',
          };
          return [this.formatSSE(errorChunk)];
        }),
      )
      .subscribe({
        next: (sseData: string) => {
          if (!res.closed) {
            res.write(sseData);
          }
        },
        error: (error: Error) => {
          const errorChunk: StreamChunk = {
            type: 'error',
            error: error.message || 'An unexpected error occurred',
          };
          if (!res.closed) {
            res.write(this.formatSSE(errorChunk));
            res.end();
          }
        },
        complete: () => {
          if (!res.closed) {
            res.end();
          }
        },
      });
  }

  /**
   * Format StreamChunk as Server-Sent Event (SSE) format
   * SSE format: "data: <json>\n\n"
   *
   * @param chunk StreamChunk to format
   * @returns SSE-formatted string
   */
  private formatSSE(chunk: StreamChunk): string {
    const data = JSON.stringify(chunk);
    return `data: ${data}\n\n`;
  }
}
```

#### SummaryService

**Path**: `apps/backend/src/summary/summary.service.ts`

**Responsibilities**:

- Creates and updates summary requests in database
- Orchestrates LLM service calls
- Manages streaming flow
- Handles errors and persistence

**Key Methods**:

```1:164:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/summary/summary.service.ts
@Injectable()
export class SummaryService {
  constructor(
    @InjectRepository(SummaryRequest)
    private readonly summaryRequestRepository: Repository<SummaryRequest>,
    private readonly llmService: LLMService,
  ) {}

  async createSummaryRequest(
    text: string,
    clientIp?: string,
  ): Promise<SummaryRequest> {
    const summaryRequest = this.summaryRequestRepository.create({
      text,
      clientIp,
      tokensUsed: 0,
      cost: 0,
      summary: null,
      completedAt: null,
      error: null,
    });

    return await this.summaryRequestRepository.save(summaryRequest);
  }

  async updateSummaryRequest(
    id: string,
    summary: string,
    tokensUsed: number,
    cost: number,
    completedAt: Date,
  ): Promise<UpdateResult> {
    return await this.summaryRequestRepository.update(id, {
      summary,
      tokensUsed,
      cost,
      completedAt,
    });
  }

  streamSummarize(
    text: string,
    clientIp?: string,
    options?: SummarizeOptions,
  ): Observable<StreamChunk> {
    // ... streaming implementation ...
  }

  private async handleError(requestId: string, error: any): Promise<void> {
    // ... error handling ...
  }

  async getSummaryRequest(id: string): Promise<SummaryRequest | null> {
    return await this.summaryRequestRepository.findOne({ where: { id } });
  }
}
```

#### SummaryModule

**Path**: `apps/backend/src/summary/summary.module.ts`

**Imports**: TypeORM feature module, LLMModule, ConfigModule

**Exports**: SummaryService

```1:20:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/summary/summary.module.ts
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

### AnalyticsModule

**Purpose**: Provides analytics and metrics aggregation.

**Location**: `apps/backend/src/analytics/`

#### AnalyticsController

**Path**: `apps/backend/src/analytics/analytics.controller.ts`

**Responsibilities**:

- Accepts GET requests to `/api/analytics`
- Validates API key
- Parses query parameters (dates, client IP)
- Returns aggregated metrics

**Key Methods**:

```1:64:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/analytics/analytics.controller.ts
@Controller('analytics')
@UseGuards(ApiKeyGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /api/analytics
   * Get aggregated metrics for summary requests
   *
   * Query parameters:
   * - startDate: Optional ISO date string for start date filtering
   * - endDate: Optional ISO date string for end date filtering
   * - clientIp: Optional client IP address for filtering
   *
   * @param startDate Optional start date for filtering
   * @param endDate Optional end date for filtering
   * @param clientIp Optional client IP for filtering
   * @returns AnalyticsResponseDto with aggregated metrics
   */
  @Get()
  async getMetrics(
    @Query('startDate', new ParseDatePipe()) startDate?: Date,
    @Query('endDate', new ParseDatePipe()) endDate?: Date,
    @Query('clientIp') clientIp?: string,
  ): Promise<AnalyticsResponseDto> {
    return await this.analyticsService.getMetrics(startDate, endDate, clientIp);
  }
}
```

#### AnalyticsService

**Path**: `apps/backend/src/analytics/analytics.service.ts`

**Responsibilities**:

- Aggregates metrics from summary requests
- Filters by date range and client IP
- Groups metrics by day
- Calculates averages

**Key Methods**:

```1:165:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/analytics/analytics.service.ts
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(SummaryRequest)
    private readonly summaryRequestRepository: Repository<SummaryRequest>,
  ) {}

  /**
   * Get aggregated metrics for summary requests
   *
   * @param startDate Optional start date for filtering
   * @param endDate Optional end date for filtering
   * @param clientIp Optional client IP for filtering
   * @returns AnalyticsResponseDto with aggregated metrics
   */
  async getMetrics(
    startDate?: Date,
    endDate?: Date,
    clientIp?: string,
  ): Promise<AnalyticsResponseDto> {
    // ... aggregation logic ...
  }

  /**
   * Get metrics grouped by day
   *
   * @param startDate Optional start date for filtering
   * @param endDate Optional end date for filtering
   * @param clientIp Optional client IP for filtering
   * @returns Array of daily metrics
   */
  private async getDailyMetrics(
    startDate?: Date,
    endDate?: Date,
    clientIp?: string,
  ): Promise<DailyMetric[]> {
    // ... daily aggregation logic ...
  }
}
```

### LLMModule

**Purpose**: Manages LLM provider integration and streaming.

**Location**: `apps/backend/src/llm/`

#### LLMService

**Path**: `apps/backend/src/llm/llm.service.ts`

**Responsibilities**:

- Orchestrates LLM provider calls
- Handles fallback logic (OpenRouter → OpenAI)
- Manages provider availability

**Key Methods**:

```1:125:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/llm/llm.service.ts
@Injectable()
export class LLMService implements ILLMService, OnModuleInit {
  constructor(
    @Optional()
    @Inject(OpenRouterService)
    private readonly openRouterService: OpenRouterService | null,
    @Optional()
    @Inject(OpenAIService)
    private readonly openAIService: OpenAIService | null,
  ) {}

  streamSummarize(
    text: string,
    options?: SummarizeOptions,
  ): Observable<StreamChunk> {
    // Tries OpenRouter first, falls back to OpenAI on failure
    // Does not retry on rate limits
  }

  getService(): ILLMService {
    // Returns available provider
  }

  getServiceName(): string {
    // Returns provider name
  }
}
```

#### BaseLLMService

**Path**: `apps/backend/src/llm/base-llm.service.ts`

**Abstract Class**: Base implementation for LLM providers.

**Responsibilities**:

- Defines common streaming logic
- Handles SSE parsing
- Estimates token counts
- Calculates costs (delegated to subclasses)

**Key Methods**:

```1:360:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/llm/base-llm.service.ts
export abstract class BaseLLMService implements ILLMService {
  streamSummarize(
    text: string,
    options?: SummarizeOptions,
  ): Observable<StreamChunk> {
    // Common streaming implementation
  }

  protected abstract getDefaultModel(): string;
  protected abstract calculateCost(...): number;
  protected abstract getApiErrorMessage(statusCode: number): string;

  protected buildMessages(text: string): Array<{ role: string; content: string }> {
    // Builds system and user messages
  }

  protected estimateTokens(text: string): number {
    // Estimates token count (~4 chars per token)
  }

  protected mapResponseToResult(...): SummarizeResult {
    // Maps API response to SummarizeResult
  }
}
```

#### OpenRouterService

**Path**: `apps/backend/src/llm/openrouter.service.ts`

**Extends**: `BaseLLMService`

**Responsibilities**:

- Implements OpenRouter-specific logic
- Adds OpenRouter headers
- Calculates OpenRouter pricing

#### OpenAIService

**Path**: `apps/backend/src/llm/openai.service.ts`

**Extends**: `BaseLLMService`

**Responsibilities**:

- Implements OpenAI-specific logic
- Calculates OpenAI pricing

### DatabaseModule

**Purpose**: Configures TypeORM connection and repositories.

**Location**: `apps/backend/src/database/`

**Components**:

#### DatabaseModule

**Path**: `apps/backend/src/database/database.module.ts`

**Responsibilities**:

- Configures TypeORM connection
- Registers entities
- Exports TypeORM module

```1:35:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/database/database.module.ts
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<{ app: AppConfig }>) => {
        // ... TypeORM configuration ...
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
```

#### Entities

**Path**: `apps/backend/src/database/entities/`

- **SummaryRequest**: Entity for `summary_requests` table

### Common Module

**Purpose**: Shared utilities, guards, decorators, interceptors.

**Location**: `apps/backend/src/common/`

#### Guards

**Path**: `apps/backend/src/common/guards/`

- **ApiKeyGuard**: Validates `X-API-Key` header

```1:44:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/common/guards/api-key.guard.ts
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService<{ app: AppConfig }>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Validates API key from request headers
  }
}
```

#### Decorators

**Path**: `apps/backend/src/common/decorators/`

- **ClientIp**: Extracts client IP from request headers

#### Interceptors

**Path**: `apps/backend/src/common/interceptors/`

- Custom interceptors for logging, error handling (if any)

## Frontend Modules

### App Router Pages

**Location**: `apps/frontend/src/app/`

#### Home Page (`page.tsx`)

**Path**: `apps/frontend/src/app/page.tsx`

**Responsibilities**:

- Renders summarization UI
- Manages streaming state
- Handles form submission

```1:66:/home/renato-siqueira/Projects/Smart-Summary-App/apps/frontend/src/app/page.tsx
export default function HomePage() {
  const { state, startStreaming, reset } = useStreamingSummary();
  const [hasStarted, setHasStarted] = useState(false);

  const handleSubmit = (text: string) => {
    setHasStarted = true;
    startStreaming(text);
  };

  const handleReset = () => {
    reset();
    setHasStarted = false;
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* UI components */}
      </SidebarInset>
    </SidebarProvider>
  );
}
```

#### Analytics Page (`analytics/page.tsx`)

**Path**: `apps/frontend/src/app/analytics/page.tsx`

**Responsibilities**:

- Renders analytics dashboard
- Fetches metrics via server action

### API Routes

**Location**: `apps/frontend/src/app/api/`

#### Summarize Route (`summarize/route.ts`)

**Path**: `apps/frontend/src/app/api/summarize/route.ts`

**Responsibilities**:

- Proxies SSE requests to backend
- Handles API key securely
- Streams response to client

```1:90:/home/renato-siqueira/Projects/Smart-Summary-App/apps/frontend/src/app/api/summarize/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = getApiKey();
    const backendUrl = `${BACKEND_URL}/api/summary`;

    // Forward the request to backend with API key
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ text }),
    });

    // Stream the response back to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    // Error handling
  }
}
```

### Server Actions

**Location**: `apps/frontend/src/app/*/actions/`

#### Get Analytics Action

**Path**: `apps/frontend/src/app/analytics/actions/get-analytics.action.ts`

**Responsibilities**:

- Fetches analytics from backend
- Handles API key securely
- Transforms response

```1:50:/home/renato-siqueira/Projects/Smart-Summary-App/apps/frontend/src/app/analytics/actions/get-analytics.action.ts
'use server';

export async function getAnalyticsAction(filters?: {
  startDate?: Date | string;
  endDate?: Date | string;
  clientIp?: string;
}): Promise<{ success: boolean; data?: AnalyticsMetrics; error?: string }> {
  try {
    const apiKey = getApiKey();

    const params = new URLSearchParams();
    // ... build query params ...

    const data = await fetchFromBackend<AnalyticsMetrics>(url, {
      apiKey,
      method: 'GET',
    });

    return { success: true, data };
  } catch (error) {
    // Error handling
  }
}
```

### Shared Libraries

**Location**: `apps/frontend/src/shared/lib/`

#### SSE Client (`sse-client.ts`)

**Path**: `apps/frontend/src/shared/lib/sse-client.ts`

**Responsibilities**:

- Creates POST-based SSE connections
- Parses SSE messages
- Handles stream cleanup

```1:168:/home/renato-siqueira/Projects/Smart-Summary-App/apps/frontend/src/shared/lib/sse-client.ts
export async function createPostSSEConnection(
  url: string,
  body: unknown,
  apiKey: string,
  onMessage: (chunk: StreamChunk) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  // Creates fetch-based SSE connection (EventSource doesn't support POST)
  // Returns cleanup function
}
```

#### HTTP Client (`http-client.ts`)

**Path**: `apps/frontend/src/shared/lib/http-client.ts`

**Responsibilities**:

- Makes backend API calls from server actions
- Forwards client IP headers
- Handles API key injection

```1:135:/home/renato-siqueira/Projects/Smart-Summary-App/apps/frontend/src/shared/lib/http-client.ts
export async function fetchFromBackend<T>(
  endpoint: string,
  options: HttpClientOptions = {}
): Promise<T> {
  // Makes HTTP request to backend
  // Automatically forwards client IP headers
  // Handles API key injection
}
```

### Custom Hooks

**Location**: `apps/frontend/src/app/*/hooks/`

#### useStreamingSummary

**Path**: `apps/frontend/src/app/summarize/hooks/useStreamingSummary.ts`

**Responsibilities**:

- Manages streaming state
- Handles SSE connection lifecycle
- Updates UI on chunk arrival

```1:167:/home/renato-siqueira/Projects/Smart-Summary-App/apps/frontend/src/app/summarize/hooks/useStreamingSummary.ts
export function useStreamingSummary(
  options: UseStreamingSummaryOptions = {},
): UseStreamingSummaryReturn {
  const [state, setState] = useState<SummaryState>({
    summary: '',
    isStreaming: false,
    isComplete: false,
  });

  const startStreaming = useCallback(
    async (text: string) => {
      // Creates SSE connection
      // Handles chunk processing
      // Updates state
    },
    [onComplete, onError],
  );

  // ... cleanup logic ...
}
```

## Shared Types Package

**Location**: `packages/types/src/`

### Summary Types

**Path**: `packages/types/src/summary/`

- **SummarizeRequest**: Request interface
- **SummarizeOptions**: Options interface
- **SummarizeResponse**: Response interface
- **StreamChunk**: SSE chunk interface

```1:16:/home/renato-siqueira/Projects/Smart-Summary-App/packages/types/src/summary/response.types.ts
export interface SummarizeResponse {
  id: string;
  summary: string;
  tokensUsed: number;
  cost: number;
  completedAt: Date;
  model: string;
}

export interface StreamChunk {
  type: 'start' | 'chunk' | 'complete' | 'error';
  content?: string;
  data?: SummarizeResponse;
  error?: string;
}
```

### Analytics Types

**Path**: `packages/types/src/analytics/`

- **AnalyticsMetrics**: Metrics interface
- **DailyMetric**: Daily metrics interface
- **SummaryRequestRecord**: Record interface

```1:28:/home/renato-siqueira/Projects/Smart-Summary-App/packages/types/src/analytics/metrics.types.ts
export interface AnalyticsMetrics {
  totalRequests: number;
  totalTokensUsed: number;
  totalCost: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
  requestsByDay: DailyMetric[];
}

export interface DailyMetric {
  date: string;
  requests: number;
  tokensUsed: number;
  cost: number;
}

export interface SummaryRequestRecord {
  id: string;
  text: string;
  summary: string;
  userId?: string;
  tokensUsed: number;
  cost: number;
  model: string;
  createdAt: Date;
  completedAt: Date;
}
```

## Component Hierarchy

### Backend

```
AppModule
├── ConfigModule (global)
├── DatabaseModule
│   └── TypeOrmModule
├── LLMModule
│   ├── OpenRouterService (optional)
│   ├── OpenAIService (optional)
│   └── LLMService
├── SummaryModule
│   ├── SummaryController
│   └── SummaryService
└── AnalyticsModule
    ├── AnalyticsController
    └── AnalyticsService
```

### Frontend

```
App Router
├── Layout (root)
├── Home Page
│   ├── SummarizeForm
│   └── StreamingSummary
├── Analytics Page
│   └── AnalyticsDashboard
├── API Routes
│   └── /api/summarize (proxy)
└── Shared
    ├── Components
    ├── Hooks
    └── Libraries
```

## Key Dependencies

### Backend Dependencies

- `@nestjs/common`: NestJS core
- `@nestjs/core`: NestJS runtime
- `@nestjs/config`: Configuration management
- `@nestjs/typeorm`: TypeORM integration
- `typeorm`: Database ORM
- `rxjs`: Reactive streams
- `helmet`: Security headers
- `class-validator`: Validation decorators
- `class-transformer`: Transformation utilities

### Frontend Dependencies

- `next`: Next.js framework
- `react`: React library
- `react-dom`: React DOM
- `typescript`: TypeScript compiler
- `tailwindcss`: CSS framework
- `next-themes`: Theme management
- `@smart-summary/types`: Shared types

## Module Assumptions

1. **Single API Key**: Shared key for all requests (no per-user auth)
2. **No User Management**: No user accounts or authentication
3. **Client IP Tracking**: IP tracking for analytics only
4. **No Rate Limiting**: No per-user or per-IP rate limiting (LLM providers handle this)
5. **Streaming Only**: Summarization always streams (no sync mode)

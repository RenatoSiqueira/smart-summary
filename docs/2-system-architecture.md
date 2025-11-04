# System Architecture

## Overview

Smart Summary App follows a modern monorepo architecture with clear separation of concerns between frontend, backend, and shared components. The system is designed for scalability, maintainability, and type safety across all layers.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Smart Summary App                         │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 15+)          │  Backend (NestJS 10+)    │
│  ├── App Router                  │  ├── Summary Module      │
│  ├── React Components            │  ├── Analytics Module    │
│  ├── SSE Client                  │  ├── LLM Module          │
│  ├── State Management            │  ├── Database Module     │
│  └── UI Components               │  └── Common Guards       │
├─────────────────────────────────────────────────────────────┤
│                 Shared Types Package                        │
│  ├── Summary Types               │  ├── Analytics Types     │
│  ├── Request/Response DTOs       │  └── Common Interfaces   │
├─────────────────────────────────────────────────────────────┤
│                    Infrastructure                           │
│  ├── PostgreSQL Database         │  ├── Docker Containers   │
│  ├── LLM Providers (OpenRouter/OpenAI) │  └── Health Checks │
└─────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

### Workspace Organization
```
Smart-Summary-App/
├── apps/
│   ├── frontend/          # Next.js application
│   └── backend/           # NestJS application
├── packages/
│   └── types/             # Shared TypeScript types
├── docs/                  # Documentation
├── docker-compose.yml     # Container orchestration
├── turbo.json            # Turborepo configuration
└── pnpm-workspace.yaml   # pnpm workspace configuration
```

### Benefits of Monorepo Architecture
- **Type Safety**: Shared types ensure consistency between frontend and backend
- **Code Reusability**: Common utilities and interfaces across applications
- **Simplified Development**: Single repository for all related code
- **Coordinated Releases**: Synchronized deployments and versioning
- **Dependency Management**: Centralized package management with pnpm

## Frontend Architecture (Next.js)

### Application Structure
```
apps/frontend/src/
├── app/                   # Next.js App Router
│   ├── layout.tsx         # Root layout with theme provider
│   ├── page.tsx           # Home page with summarization
│   ├── analytics/         # Analytics dashboard
│   └── summarize/         # Summarization components
├── shared/                # Shared components and utilities
│   ├── components/        # Reusable UI components
│   ├── lib/              # Utility functions and SSE client
│   └── hooks/            # Custom React hooks
└── styles/               # Global styles and Tailwind config
```

### Key Components

#### SSE Client (`shared/lib/sse-client.ts`)
- **Purpose**: Handles Server-Sent Events for real-time streaming
- **Features**: 
  - Automatic reconnection
  - Error handling
  - Cleanup management
  - TypeScript integration

#### Streaming Hook (`useStreamingSummary`)
- **Purpose**: Manages streaming state and SSE connection
- **Features**:
  - State management for streaming process
  - Automatic cleanup on unmount
  - Error handling and recovery
  - Type-safe chunk processing

#### UI Components
- **Radix UI**: Accessible, unstyled components
- **TailwindCSS**: Utility-first styling
- **Framer Motion**: Smooth animations and transitions
- **Responsive Design**: Mobile-first approach

### State Management
- **React Hooks**: useState, useEffect, useCallback for local state
- **Custom Hooks**: Encapsulated business logic
- **Context API**: Theme management with next-themes
- **No Global State**: Simplified architecture with prop drilling

## Backend Architecture (NestJS)

### Module Structure
```
apps/backend/src/
├── app.module.ts          # Root application module
├── main.ts               # Application bootstrap
├── config/               # Configuration management
├── database/             # Database configuration and migrations
├── common/               # Shared guards, decorators, interceptors
├── summary/              # Summary business logic
├── analytics/            # Analytics and metrics
├── llm/                  # LLM service abstraction
└── health/               # Health check endpoints
```

### Core Modules

#### Summary Module
- **Controller**: Handles HTTP requests and SSE streaming
- **Service**: Business logic for summary processing
- **Entity**: Database entity for summary requests
- **DTOs**: Data transfer objects for validation

#### LLM Module
- **LLMService**: Main service with provider abstraction
- **OpenRouterService**: OpenRouter API integration
- **OpenAIService**: OpenAI API integration (fallback)
- **BaseLLMService**: Shared functionality for LLM providers

#### Analytics Module
- **Service**: Aggregates metrics from summary requests
- **Controller**: Exposes analytics endpoints
- **DTOs**: Response objects for analytics data

#### Database Module
- **TypeORM Configuration**: Database connection and entity management
- **Migrations**: Schema versioning and updates
- **Entities**: Database models with proper indexing

### Design Patterns

#### Dependency Injection
- **NestJS IoC Container**: Automatic dependency resolution
- **Service Abstraction**: Interface-based service design
- **Provider Pattern**: Multiple LLM provider support

#### Repository Pattern
- **TypeORM Repositories**: Data access abstraction
- **Entity Management**: Automated CRUD operations
- **Query Builder**: Complex query construction

#### Observer Pattern
- **RxJS Observables**: Streaming data processing
- **Event-Driven Architecture**: Loose coupling between components
- **Error Handling**: Centralized error processing

## Data Flow Architecture

### Summary Generation Flow
```
1. User Input (Frontend)
   ↓
2. Form Validation (React Hook Form + Zod)
   ↓
3. SSE Connection (Frontend → Backend API)
   ↓
4. API Key Validation (ApiKeyGuard)
   ↓
5. Request Creation (SummaryService)
   ↓
6. LLM Processing (LLMService → Provider)
   ↓
7. Streaming Response (SSE chunks)
   ↓
8. Database Update (Request completion)
   ↓
9. Frontend State Update (useStreamingSummary)
```

### Analytics Data Flow
```
1. Analytics Request (Frontend)
   ↓
2. API Key Validation (ApiKeyGuard)
   ↓
3. Query Parameter Validation (ParseDatePipe)
   ↓
4. Database Aggregation (AnalyticsService)
   ↓
5. Response Formatting (AnalyticsResponseDto)
   ↓
6. Frontend Visualization (Charts/Tables)
```

## Database Architecture

### Entity Relationship
```
SummaryRequest Entity:
├── id (UUID, Primary Key)
├── text (TEXT, Original content)
├── summary (TEXT, Generated summary)
├── clientIp (VARCHAR, Client identification)
├── tokensUsed (INTEGER, Token consumption)
├── cost (DECIMAL, Processing cost)
├── createdAt (TIMESTAMP, Request time)
├── completedAt (TIMESTAMP, Completion time)
└── error (TEXT, Error information)
```

### Indexing Strategy
- **Primary Index**: `id` (UUID)
- **Performance Indexes**:
  - `clientIp` for user-specific queries
  - `createdAt` for time-based filtering
  - `(createdAt, clientIp)` for combined queries
  - `(completedAt, error)` for analytics filtering

### Migration Management
- **TypeORM Migrations**: Version-controlled schema changes
- **Automated Deployment**: Migration execution in Docker containers
- **Rollback Support**: Safe schema rollback capabilities

## Security Architecture

### Authentication & Authorization
```
Request Flow:
1. Client Request → API Key Header (X-API-Key)
2. ApiKeyGuard → Timing-Safe Comparison
3. Request Processing → Authorized Endpoints
4. Response → Secure Headers (Helmet.js)
```

### Input Validation
- **Class-Validator**: DTO validation with decorators
- **Zod Schemas**: Frontend form validation
- **SQL Injection Prevention**: TypeORM parameterized queries
- **XSS Protection**: Helmet.js security headers

### Error Handling
- **Secure Error Messages**: No sensitive information exposure
- **Centralized Exception Handling**: Consistent error responses
- **Logging**: Comprehensive error tracking without sensitive data

## Streaming Architecture

### Server-Sent Events (SSE)
```
SSE Flow:
1. Client establishes EventSource connection
2. Server maintains persistent HTTP connection
3. Chunked data transmission (JSON format)
4. Automatic reconnection on connection loss
5. Proper cleanup on completion/error
```

### Chunk Types
- **start**: Streaming initiation
- **chunk**: Incremental content
- **complete**: Final result with metadata
- **error**: Error information

### Connection Management
- **Timeout Protection**: 5-minute maximum duration
- **Memory Management**: Proper cleanup and garbage collection
- **Error Recovery**: Graceful error handling and connection closure

## Deployment Architecture

### Containerization
```
Docker Services:
├── postgres (PostgreSQL 15)
│   ├── Data persistence
│   ├── Health checks
│   └── Network isolation
├── backend (NestJS)
│   ├── Multi-stage build
│   ├── Production optimization
│   └── Health endpoints
└── frontend (Next.js)
    ├── Static optimization
    ├── Server-side rendering
    └── Asset optimization
```

### Network Architecture
- **Internal Network**: Service-to-service communication
- **Port Mapping**: External access configuration
- **Health Checks**: Service availability monitoring
- **Volume Management**: Data persistence and backup

## Performance Considerations

### Frontend Optimization
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js automatic optimization
- **Bundle Analysis**: Webpack bundle analyzer integration
- **Caching**: Browser caching with proper headers

### Backend Optimization
- **Connection Pooling**: Database connection management
- **Query Optimization**: Indexed queries and aggregations
- **Memory Management**: Streaming reduces memory footprint
- **Caching Ready**: Architecture supports Redis integration

### Database Optimization
- **Indexing Strategy**: Optimized for common query patterns
- **Connection Pooling**: Efficient connection management
- **Query Performance**: Aggregated analytics queries
- **Backup Strategy**: Regular automated backups

## Scalability Considerations

### Horizontal Scaling
- **Stateless Design**: Easy horizontal scaling
- **Load Balancing**: Multiple backend instances support
- **Database Scaling**: Read replicas and connection pooling
- **CDN Integration**: Static asset distribution

### Vertical Scaling
- **Resource Optimization**: Efficient memory and CPU usage
- **Database Tuning**: Performance optimization
- **Caching Layers**: Redis integration ready
- **Monitoring**: Performance metrics and alerting

## Technology Integration

### External Services
- **OpenRouter API**: Primary LLM provider
- **OpenAI API**: Fallback LLM provider
- **PostgreSQL**: Primary data storage
- **Docker Registry**: Container image storage

### Development Tools
- **Turborepo**: Build system and task runner
- **pnpm**: Package manager with workspace support
- **TypeScript**: Type safety across the stack
- **ESLint/Prettier**: Code quality and formatting

This architecture provides a solid foundation for a scalable, maintainable, and secure AI-powered text summarization application with room for future enhancements and integrations.

# Smart Summary App

An AI-powered text summarization web application that enables users to generate concise summaries from long-form text content using Large Language Models (LLMs). The application features real-time streaming responses and comprehensive analytics for monitoring usage, token consumption, and costs.

## Features

- **Streaming Summarization**: Real-time summary generation using Server-Sent Events (SSE) for better user experience
- **Analytics Dashboard**: Comprehensive metrics including total requests, tokens used, costs, and daily trends
- **Multi-Provider Support**: Support for OpenRouter (primary) and OpenAI (fallback) with automatic failover
- **Request Tracking**: All summary requests are stored with metadata for analytics and reporting
- **Modern UI**: Built with Next.js App Router, React, and TailwindCSS

## Tech Stack

### Backend

- **Framework**: NestJS 10+ with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Streaming**: Server-Sent Events (SSE)
- **Validation**: class-validator & class-transformer

### Frontend

- **Framework**: Next.js 15+ (App Router) with React 18+
- **Styling**: TailwindCSS with Radix UI components
- **State Management**: React Hooks
- **Type Safety**: TypeScript with shared types package

### Infrastructure

- **Monorepo**: pnpm workspaces with Turborepo
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 15

## Prerequisites

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **PostgreSQL**: 15+ (for local development)
- **Docker** (optional, for containerized deployment)

## Setup Instructions

### Option 1: Docker Deployment (Recommended)

The easiest way to run the application is using Docker Compose:

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd Smart-Summary-App
   ```

2. **Create a `.env` file** in the root directory:

   ```bash
   # Application Environment
   NODE_ENV=production

   # Database Configuration
   POSTGRES_USER=smartsummary
   POSTGRES_PASSWORD=your_secure_password
   POSTGRES_DB=smart_summary
   POSTGRES_PORT=5432

   # Backend Configuration
   BACKEND_PORT=3000

   # Frontend Configuration
   FRONTEND_PORT=3001
   NEXT_PUBLIC_SITE_URL=http://localhost:3001
   API_URL=http://localhost:3000

   # LLM Provider Configuration (at least one required)
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini
   # OR
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_DEFAULT_MODEL=gpt-4o-mini

   # API Security
   API_KEY=your_secure_api_key_here
   ```

3. **Build and start all services**:

   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**:

   ```bash
   docker-compose exec backend pnpm --filter @smart-summary/backend migration:run
   ```

5. **Access the application**:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000/api

For more Docker commands and troubleshooting, see [DOCKER.md](./DOCKER.md).

### Option 2: Local Development

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd Smart-Summary-App
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Set up PostgreSQL database**:
   - Create a PostgreSQL database named `smart_summary`
   - Or use Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=smart_summary postgres:15-alpine`

4. **Configure environment variables**:

   **Backend** (`apps/backend/.env.local`):

   ```bash
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_summary
   API_KEY=your-secret-api-key
   OPENROUTER_API_KEY=your-openrouter-api-key
   OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini
   # Optional
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_DEFAULT_MODEL=gpt-4o-mini
   ```

   **Frontend** (`apps/frontend/.env.local`):

   ```bash
   API_URL=http://localhost:3000
   API_KEY=your-secret-api-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3001
   ```

5. **Run database migrations**:

   ```bash
   cd apps/backend
   pnpm migration:run
   ```

6. **Start the backend** (from root):

   ```bash
   pnpm --filter @smart-summary/backend dev
   ```

   Backend will be available at http://localhost:3000

7. **Start the frontend** (from root, in a new terminal):
   ```bash
   pnpm --filter @smart-summary/frontend dev
   ```
   Frontend will be available at http://localhost:3001

## Architecture Overview

The Smart Summary App follows a **monorepo architecture** with clear separation between frontend and backend services.

### High-Level Architecture

```
User → Next.js Frontend → NestJS Backend → LLM Provider (OpenRouter/OpenAI)
                              ↓
                         PostgreSQL Database
```

### System Components

1. **Frontend (Next.js)**:
   - User interface for text input and summary display
   - Analytics dashboard for viewing metrics
   - Server Actions for server-side data fetching
   - API Routes for SSE streaming proxy

2. **Backend (NestJS)**:
   - Summary Controller: Handles summarization requests with SSE streaming
   - Analytics Controller: Provides aggregated metrics
   - LLM Service: Manages LLM provider integration with fallback
   - Database Service: Data persistence using TypeORM

3. **Database (PostgreSQL)**:
   - Stores summary requests with metadata (tokens, cost, timestamps)
   - Supports analytics queries

### Data Flow

**Summarization Flow**:

```
User submits text → Next.js API Route → NestJS Controller → LLM Service
→ OpenRouter/OpenAI API → Stream chunks back → Update database
```

**Analytics Flow**:

```
User requests analytics → Next.js Server Action → NestJS Controller
→ Analytics Service → PostgreSQL queries → Return aggregated metrics
```

### Key Design Decisions

- **SSE Streaming**: One-way streaming using Server-Sent Events (simpler than WebSockets for this use case)
- **Server-Side API Key**: API keys are never exposed to the client browser
- **Provider Fallback**: Automatic failover from OpenRouter to OpenAI if primary fails
- **Monorepo Structure**: Shared types package ensures type safety across frontend and backend

For detailed architecture documentation, see:

- [System Architecture](./docs/2-system-architecture.md) - Complete technical architecture and design patterns
- [API Documentation](./docs/3-api-documentation.md) - Complete API reference and integration guide
- [Database Schema](./docs/4-database-schema.md) - Database design and data management

## Assumptions

### Business Assumptions

1. **Single API Key Model**: A single shared API key is sufficient for all requests (no user management in MVP)
2. **SSE Streaming is Sufficient**: One-way streaming meets UX requirements (simpler than WebSockets)
3. **Cost Estimation is Acceptable**: Approximate token/cost calculations are acceptable for MVP
4. **Single Table Design**: Single `summary_requests` table sufficient for MVP (no normalization needed initially)

### Technical Assumptions

1. **PostgreSQL Availability**: Database is always available (use managed service with HA)
2. **LLM Provider Reliability**: At least one LLM provider is available (fallback mechanism provides redundancy)
3. **Network Stability**: Network connections are generally stable for SSE streaming
4. **Token Estimation**: ~4 characters per token approximation is acceptable (can use actual tokenizer later)

### Operational Assumptions

1. **Development Environment**: Developers have local PostgreSQL and Node.js installed
2. **API Key Management**: API keys managed via environment variables
3. **Database Backups**: Managed database service handles backups
4. **Monitoring**: Basic console logging sufficient initially (can add structured logging later)

For detailed architecture and design documentation, see the [Documentation Index](./docs/README.md).

## Future Improvements

### High Priority

- **Rate Limiting**: Implement per-IP and per-user rate limiting to prevent abuse
- **Error Handling**: Improve error messages with user-friendly messages
- **Test Coverage**: Increase test coverage to 80%+
- **Monitoring & Alerting**: Add structured logging, APM, and centralized logging

### Medium Priority

- **User Management**: Add user authentication, profiles, and per-user summary history
- **Summary History**: "My Summaries" page with search and filter capabilities
- **Caching Layer**: Redis cache for frequently accessed analytics data
- **Queue System**: Message queue for LLM requests to handle rate limits gracefully

### Low Priority

- **Advanced Analytics**: Summary quality metrics, model performance comparison
- **Batch Processing**: File upload (PDF, DOCX, TXT) and batch summarization
- **Multiple Summary Formats**: Selectable formats (bullet points, paragraph, table)
- **Token Estimation Accuracy**: Use actual tokenizer libraries (tiktoken) instead of heuristic

For detailed technical documentation, see the [Documentation Index](./docs/README.md).

## Scaling Considerations

### Current Architecture Limitations

- Single database instance (no read replicas)
- Synchronous LLM API calls (no async queue)
- No horizontal scaling for backend (stateless, but not configured)
- Direct database queries for analytics (no caching layer)

### Scalability Improvements

1. **Database**:
   - Read replicas for analytics queries
   - Database partitioning by date for large datasets
   - Connection pooling optimization

2. **Backend**:
   - Horizontal scaling with load balancer (stateless design supports this)
   - Queue system for async job processing (RabbitMQ, AWS SQS)
   - Redis cache for frequently accessed data

3. **Frontend**:
   - CDN for static assets
   - Next.js optimizations (already implemented)

4. **Infrastructure**:
   - Container orchestration (Kubernetes, Docker Swarm)
   - Auto-scaling based on load
   - Multi-region deployment for global users

### Performance Targets

- **Backend Response Time**: < 1 second (excluding LLM calls)
- **LLM Streaming**: Real-time
- **Analytics Queries**: < 500ms (small datasets), < 2s (large datasets with caching)

## Security Considerations

### Current Security Measures

1. **API Key Authentication**: Server-to-server authentication via API key (never exposed to client)
2. **CORS Protection**: Production environment requires explicit allowed origins configuration
3. **Input Validation**: All inputs validated via DTOs with class-validator
4. **SQL Injection Prevention**: TypeORM parameterized queries
5. **Security Headers**: Helmet middleware for HTTP security headers
6. **HTTPS**: All external communication over HTTPS (in production)

### Security Recommendations for Production

1. **CORS Configuration**: CORS is already properly configured:
   - **Development**: Allows all origins (correct for local development)
   - **Production**: Requires `ALLOWED_ORIGINS` environment variable to be set (throws error if not configured)
   - Ensure `ALLOWED_ORIGINS` is set in production: `ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`
2. **Rate Limiting**: Implement rate limiting for API endpoints (currently handled by LLM providers)
3. **WAF**: Use Web Application Firewall (Cloudflare, AWS WAF)
4. **Secrets Management**: Use secure secret management (AWS Secrets Manager, HashiCorp Vault)
5. **Monitoring**: Implement security monitoring and alerting
6. **Audit Logging**: Log all API access for audit trails
7. **Regular Updates**: Keep dependencies up to date with `npm audit`
8. **Data Encryption**: Implement encryption at rest for sensitive fields if needed

### Compliance Considerations

- **GDPR**: If serving EU users, implement user data export and deletion capabilities
- **PCI DSS**: Not applicable (no payment processing)
- **HIPAA**: Not applicable unless specifically configured for healthcare use

For detailed security documentation, see [Security & Compliance](./docs/7-security-compliance.md).

## Development

### Project Structure

```
Smart-Summary-App/
├── apps/
│   ├── backend/          # NestJS backend application
│   └── frontend/          # Next.js frontend application
├── packages/
│   └── types/             # Shared TypeScript types
├── docs/                  # Architecture and design documentation
└── docker-compose.yml     # Docker Compose configuration
```

### Available Scripts

**Root Level**:

- `pnpm dev`: Start all apps in development mode
- `pnpm build`: Build all apps
- `pnpm lint`: Lint all apps
- `pnpm test`: Run tests for all apps

**Backend** (`apps/backend`):

- `pnpm dev`: Start backend in watch mode
- `pnpm build`: Build backend
- `pnpm migration:run`: Run database migrations
- `pnpm migration:generate`: Generate new migration

**Frontend** (`apps/frontend`):

- `pnpm dev`: Start frontend in development mode
- `pnpm build`: Build frontend for production
- `pnpm start`: Start production server

### Testing

```bash
# Run all tests
pnpm test

# Run backend tests
cd apps/backend && pnpm test

# Run frontend tests
cd apps/frontend && pnpm test
```

## Documentation

Comprehensive documentation is available in the `docs/` directory. For a complete overview, see the [Documentation Index](./docs/README.md).

**Key Documentation Files:**

- [Executive Summary](./docs/1-executive-summary.md) - Project overview and business value
- [System Architecture](./docs/2-system-architecture.md) - Technical architecture and design patterns
- [API Documentation](./docs/3-api-documentation.md) - Complete API reference and integration guide
- [Database Schema](./docs/4-database-schema.md) - Database design and data management
- [Deployment Guide](./docs/5-deployment-guide.md) - Deployment and operations guide
- [Development Guide](./docs/6-development-guide.md) - Developer workflows and best practices
- [Security & Compliance](./docs/7-security-compliance.md) - Security measures and compliance considerations

## License

UNLICENSED - Private project

## Author

Renato Siqueira (https://github.com/renatosiqueira)

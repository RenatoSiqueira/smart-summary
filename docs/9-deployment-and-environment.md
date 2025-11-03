# Deployment & Environment

## Overview

This document describes the deployment process, environment configurations, infrastructure setup, and operational considerations for the Smart Summary App.

## Environment Configuration

### Environment Variables

#### Backend Environment Variables

**Location**: `.env.local` or `.env` (backend root)

**Required Variables**:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/smart_summary

# API Security
API_KEY=your-secret-api-key

# LLM Providers (at least one required)
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_DEFAULT_MODEL=openai/gpt-3.5-turbo
OPENAI_API_KEY=your-openai-api-key
OPENAI_DEFAULT_MODEL=gpt-3.5-turbo
```

**Optional Variables**:

- `OPENROUTER_DEFAULT_MODEL`: Default model for OpenRouter
- `OPENAI_DEFAULT_MODEL`: Default model for OpenAI

#### Frontend Environment Variables

**Location**: `.env.local` or `.env` (frontend root)

**Required Variables**:

```bash
# Backend API URL
API_URL=http://localhost:3000

# API Key (server-side only, never exposed to client)
API_KEY=your-secret-api-key

# Public Site URL (for metadata)
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

**Optional Variables**:

- `NEXT_PUBLIC_SITE_URL`: Public site URL for metadata (defaults to `http://localhost:3001`)

### Environment Configuration

**Backend**: Uses `@nestjs/config` for environment management

```1:23:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/config/configuration.ts
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
```

**Frontend**: Uses Next.js environment variable handling

- Server-side: `process.env.*`
- Client-side: `process.env.NEXT_PUBLIC_*` (only for public variables)

## Deployment Environments

### Development Environment

**Configuration**:

- Local database (PostgreSQL)
- Development API keys
- Verbose logging
- Hot reload enabled

**Setup**:

```bash
# Backend
cd apps/backend
npm install
cp .env.example .env.local
# Edit .env.local with your values
npm run start:dev

# Frontend
cd apps/frontend
npm install
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
```

**Access**:

- Backend: `http://localhost:3000/api`
- Frontend: `http://localhost:3001`

### Staging Environment

**Configuration**:

- Staging database (PostgreSQL)
- Staging API keys
- Production-like settings
- Error logging enabled

**Deployment**: Similar to production but with staging credentials

### Production Environment

**Configuration**:

- Production database (managed PostgreSQL service)
- Production API keys
- Optimized logging
- SSL/TLS enabled
- Security headers configured

**Considerations**:

- API keys stored securely (AWS Secrets Manager, Vercel Secrets, etc.)
- Database backups enabled
- Monitoring and alerting configured
- Rate limiting configured (if needed)

## Deployment Options

### Backend Deployment

#### Option 1: Docker Container

**Dockerfile**:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN cd apps/backend && pnpm build

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "apps/backend/dist/main.js"]
```

**Docker Compose**:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=${DATABASE_URL}
      - API_KEY=${API_KEY}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=smart_summary
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Option 2: Platform as a Service (PaaS)

**Vercel**:

- Deploy NestJS backend as serverless functions
- Configure environment variables
- Set up API routes

**Heroku**:

- Deploy via Git push
- Configure environment variables
- Set up PostgreSQL addon

**Railway**:

- Deploy via Git push
- Configure environment variables
- Set up PostgreSQL service

#### Option 3: Cloud Infrastructure

**AWS**:

- EC2 for backend
- RDS for PostgreSQL
- Elastic Beanstalk for deployment

**Google Cloud**:

- Cloud Run for backend
- Cloud SQL for PostgreSQL

**Azure**:

- App Service for backend
- Azure Database for PostgreSQL

### Frontend Deployment

#### Option 1: Vercel (Recommended)

**Deployment**:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps/frontend
vercel
```

**Configuration**:

- Set environment variables in Vercel dashboard
- Configure build settings
- Set up custom domain (optional)

#### Option 2: Docker Container

**Dockerfile**:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .

RUN cd apps/frontend && pnpm build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/public ./public
COPY --from=builder /app/apps/frontend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node_modules/.bin/next", "start"]
```

#### Option 3: Static Export

**Configuration**: If Next.js supports static export for this app

```bash
cd apps/frontend
npm run build
npm run export
```

**Deploy**: Upload `out/` directory to static hosting (S3, Cloudflare Pages, etc.)

## Database Deployment

### Migration Strategy

**TypeORM Migrations**:

```bash
# Generate migration
cd apps/backend
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

**Production Migrations**:

- Run migrations as part of deployment process
- Test migrations on staging first
- Have rollback plan ready

### Database Backups

**Automated Backups**:

- Configure daily backups
- Retain backups for 30+ days
- Test restore procedures

**Manual Backups**:

```bash
pg_dump -h hostname -U username -d database_name > backup.sql
```

## Build Pipeline

### Build Process

**Backend**:

```bash
# Install dependencies
npm install

# Build TypeScript
cd apps/backend
npm run build

# Output: dist/
```

**Frontend**:

```bash
# Install dependencies
npm install

# Build Next.js app
cd apps/frontend
npm run build

# Output: .next/
```

### CI/CD Pipeline

**GitHub Actions Example**:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Test
        run: npm test

  deploy-backend:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Deployment commands
          # e.g., Docker build and push, or PaaS deployment

  deploy-frontend:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Infrastructure Diagram

```mermaid
graph TB
    subgraph "Production Environment"
        User[Users]
        CDN[CDN / Load Balancer]
        Frontend[Next.js Frontend<br/>Vercel / Container]
        Backend[NestJS Backend<br/>Container / Serverless]
        Database[(PostgreSQL<br/>Managed Service)]

        User -->|HTTPS| CDN
        CDN -->|HTTPS| Frontend
        Frontend -->|HTTPS| Backend
        Backend -->|SQL| Database
        Backend -->|HTTPS| OpenRouter[OpenRouter API]
        Backend -->|HTTPS| OpenAI[OpenAI API]
    end

    subgraph "Monitoring & Logging"
        Logs[Log Aggregation<br/>CloudWatch / Datadog]
        Metrics[Metrics<br/>Prometheus / CloudWatch]
    end

    Backend --> Logs
    Backend --> Metrics
```

## Operational Considerations

### Monitoring

**Application Monitoring**:

- Error rates
- Response times
- Request throughput
- Database query performance

**Infrastructure Monitoring**:

- CPU usage
- Memory usage
- Disk usage
- Network traffic

**Tools**:

- Application Performance Monitoring (APM): New Relic, Datadog
- Log Aggregation: CloudWatch, Datadog, Elasticsearch
- Uptime Monitoring: Pingdom, UptimeRobot

### Logging

**Structured Logging**:

- Use structured log format (JSON)
- Include request IDs for tracing
- Log levels: DEBUG, INFO, WARN, ERROR

**Log Aggregation**:

- Centralized log storage
- Log retention policy
- Log search and analysis

### Health Checks

**Health Check Endpoint** (recommended):

```typescript
@Get('health')
healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
```

**Database Health Check**:

```typescript
@Get('health/db')
async databaseHealthCheck() {
  try {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', database: 'connected' };
  } catch (error) {
    return { status: 'error', database: 'disconnected' };
  }
}
```

### Scaling

**Horizontal Scaling**:

- Stateless backend allows multiple instances
- Load balancer distributes requests
- Database connection pooling

**Vertical Scaling**:

- Increase instance size (CPU, memory)
- Optimize database queries
- Add caching layer (Redis)

**Auto-Scaling**:

- Configure auto-scaling based on CPU/memory
- Set min/max instance counts
- Configure scaling policies

## Backup and Disaster Recovery

### Database Backups

**Automated Backups**:

- Daily full backups
- Point-in-time recovery (PITR) if available
- Backup retention: 30+ days

**Backup Storage**:

- Store backups in separate region
- Encrypt backups
- Test restore procedures regularly

### Disaster Recovery Plan

**RTO (Recovery Time Objective)**: < 4 hours
**RPO (Recovery Point Objective)**: < 1 hour

**Steps**:

1. Identify critical components
2. Document recovery procedures
3. Test recovery procedures regularly
4. Maintain runbooks

## Security in Deployment

### Secrets Management

**Production Secrets**:

- Use secure secret management (AWS Secrets Manager, HashiCorp Vault)
- Never commit secrets to version control
- Rotate secrets periodically
- Audit secret access

### Network Security

**Firewall Rules**:

- Restrict database access to backend only
- Allow only necessary ports
- Use security groups/VPCs

**SSL/TLS**:

- Enforce HTTPS in production
- Use valid SSL certificates
- Configure HSTS headers

### Access Control

**Production Access**:

- Limit access to production environments
- Use multi-factor authentication (MFA)
- Audit access logs
- Use least privilege principle

## Deployment Assumptions

1. **Managed Database**: PostgreSQL managed service (RDS, Cloud SQL, etc.)
2. **HTTPS Enforcement**: HTTPS enforced in production
3. **Environment Variables**: Securely managed via secret management
4. **CI/CD Pipeline**: Automated deployment pipeline configured
5. **Monitoring**: Application and infrastructure monitoring configured
6. **Backups**: Automated database backups configured

## Recommendations

### Production Readiness Checklist

- [ ] Environment variables configured securely
- [ ] Database migrations tested and ready
- [ ] SSL/TLS certificates configured
- [ ] Monitoring and alerting configured
- [ ] Logging configured
- [ ] Backups configured
- [ ] Health checks implemented
- [ ] Security headers configured
- [ ] CORS origins restricted
- [ ] Rate limiting configured (if needed)
- [ ] Error handling tested
- [ ] Performance tested
- [ ] Disaster recovery plan documented

### Deployment Best Practices

1. **Blue-Green Deployment**: Minimize downtime with blue-green deployments
2. **Canary Releases**: Gradual rollout of new versions
3. **Feature Flags**: Toggle features without deployment
4. **Rollback Plan**: Quick rollback procedure ready
5. **Testing**: Test in staging before production
6. **Documentation**: Keep deployment docs updated

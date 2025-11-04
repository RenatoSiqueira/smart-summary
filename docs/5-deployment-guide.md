# Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying Smart Summary App in various environments, from local development to production deployment using Docker containers.

## Prerequisites

### System Requirements
- **Node.js**: >= 18.0.0
- **pnpm**: >= 9.0.0
- **PostgreSQL**: 15+ (for local development)
- **Docker**: Latest version (for containerized deployment)
- **Docker Compose**: v2.0+ (for orchestrated deployment)

### Required Environment Variables
- `OPENROUTER_API_KEY` or `OPENAI_API_KEY`: LLM provider API key
- `API_KEY`: Application API key for endpoint security
- `DATABASE_URL`: PostgreSQL connection string

## Deployment Options

### Option 1: Docker Deployment (Recommended)

Docker deployment is the recommended approach for both development and production environments.

#### 1.1 Quick Start with Docker Compose

**Step 1: Clone the Repository**
```bash
git clone <repository-url>
cd Smart-Summary-App
```

**Step 2: Create Environment Configuration**
Create a `.env` file in the root directory:

```bash
# Application Environment
NODE_ENV=production

# Database Configuration
POSTGRES_USER=smartsummary
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=smart_summary
POSTGRES_PORT=5432

# Backend Configuration
BACKEND_PORT=3000
DATABASE_URL=postgresql://smartsummary:your_secure_password_here@postgres:5432/smart_summary

# Frontend Configuration
FRONTEND_PORT=3001
NEXT_PUBLIC_SITE_URL=http://localhost:3001
API_URL=http://backend:3000

# LLM Provider Configuration (choose one or both)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini

# Alternative: OpenAI Configuration
# OPENAI_API_KEY=your_openai_api_key_here
# OPENAI_DEFAULT_MODEL=gpt-4o-mini

# API Security
API_KEY=your_secure_api_key_here

# CORS Configuration (production only)
ALLOWED_ORIGINS=http://localhost:3001,https://yourdomain.com
```

**Step 3: Build and Start Services**
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

**Step 4: Run Database Migrations**
```bash
# Run migrations
docker-compose exec backend pnpm --filter @smart-summary/backend migration:run

# Verify migration status
docker-compose exec backend pnpm --filter @smart-summary/backend typeorm migration:show
```

**Step 5: Verify Deployment**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000/api
- Health Check: http://localhost:3000/api/health

#### 1.2 Production Docker Deployment

For production deployment, use the following enhanced configuration:

**Production .env file:**
```bash
# Production Environment
NODE_ENV=production

# Database Configuration (use strong passwords)
POSTGRES_USER=smartsummary
POSTGRES_PASSWORD=your_very_secure_password_here
POSTGRES_DB=smart_summary
POSTGRES_PORT=5432
DATABASE_URL=postgresql://smartsummary:your_very_secure_password_here@postgres:5432/smart_summary

# Backend Configuration
BACKEND_PORT=3000

# Frontend Configuration
FRONTEND_PORT=3001
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
API_URL=http://backend:3000

# LLM Provider Configuration
OPENROUTER_API_KEY=your_production_openrouter_api_key
OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini

# API Security (generate strong key)
API_KEY=your_production_api_key_here

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Optional: SSL/TLS Configuration
# SSL_CERT_PATH=/path/to/cert.pem
# SSL_KEY_PATH=/path/to/key.pem
```

**Production Docker Compose Override:**
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  postgres:
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}

  backend:
    restart: always
    environment:
      NODE_ENV: production
    healthcheck:
      test: ['CMD-SHELL', 'curl -f http://localhost:3000/api/health || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    restart: always
    environment:
      NODE_ENV: production
    healthcheck:
      test: ['CMD-SHELL', 'curl -f http://localhost:3001 || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
    driver: local
```

**Deploy with production configuration:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Option 2: Manual Deployment

For environments where Docker is not available or preferred.

#### 2.1 Local Development Setup

**Step 1: Install Dependencies**
```bash
# Install pnpm globally
npm install -g pnpm

# Install project dependencies
pnpm install
```

**Step 2: Database Setup**
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE smart_summary;
CREATE USER smartsummary WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE smart_summary TO smartsummary;
\q
```

**Step 3: Environment Configuration**
Create `.env.local` files in both apps:

**apps/backend/.env.local:**
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://smartsummary:your_password@localhost:5432/smart_summary
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini
API_KEY=your_development_api_key
```

**apps/frontend/.env.local:**
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3001
API_URL=http://localhost:3000
API_KEY=your_development_api_key
```

**Step 4: Run Database Migrations**
```bash
cd apps/backend
pnpm migration:run
```

**Step 5: Start Development Servers**
```bash
# Start all services in development mode
pnpm dev

# Or start individually
pnpm --filter @smart-summary/backend dev
pnpm --filter @smart-summary/frontend dev
```

#### 2.2 Production Manual Deployment

**Step 1: Build Applications**
```bash
# Build all applications
pnpm build

# Or build individually
pnpm --filter @smart-summary/backend build
pnpm --filter @smart-summary/frontend build
```

**Step 2: Production Environment Setup**
Create production environment files with secure configurations.

**Step 3: Start Production Services**
```bash
# Start backend
cd apps/backend
pnpm start:prod

# Start frontend (in another terminal)
cd apps/frontend
pnpm start
```

### Option 3: Cloud Deployment

#### 3.1 AWS Deployment

**Using AWS ECS with Docker:**

1. **Build and Push Images**
```bash
# Build images
docker build -f apps/backend/Dockerfile -t smart-summary-backend .
docker build -f apps/frontend/Dockerfile -t smart-summary-frontend .

# Tag for ECR
docker tag smart-summary-backend:latest 123456789012.dkr.ecr.region.amazonaws.com/smart-summary-backend:latest
docker tag smart-summary-frontend:latest 123456789012.dkr.ecr.region.amazonaws.com/smart-summary-frontend:latest

# Push to ECR
docker push 123456789012.dkr.ecr.region.amazonaws.com/smart-summary-backend:latest
docker push 123456789012.dkr.ecr.region.amazonaws.com/smart-summary-frontend:latest
```

2. **RDS PostgreSQL Setup**
- Create RDS PostgreSQL instance
- Configure security groups
- Update DATABASE_URL environment variable

3. **ECS Task Definition**
Create task definitions for backend and frontend services with appropriate environment variables.

#### 3.2 Google Cloud Platform

**Using Cloud Run:**

1. **Build and Deploy Backend**
```bash
# Build and deploy backend
gcloud builds submit --tag gcr.io/PROJECT-ID/smart-summary-backend apps/backend
gcloud run deploy smart-summary-backend \
  --image gcr.io/PROJECT-ID/smart-summary-backend \
  --platform managed \
  --region us-central1 \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=postgresql://..." \
  --allow-unauthenticated
```

2. **Build and Deploy Frontend**
```bash
# Build and deploy frontend
gcloud builds submit --tag gcr.io/PROJECT-ID/smart-summary-frontend apps/frontend
gcloud run deploy smart-summary-frontend \
  --image gcr.io/PROJECT-ID/smart-summary-frontend \
  --platform managed \
  --region us-central1 \
  --set-env-vars="NEXT_PUBLIC_SITE_URL=https://...,API_URL=https://..." \
  --allow-unauthenticated
```

#### 3.3 DigitalOcean App Platform

Create `app.yaml`:
```yaml
name: smart-summary-app
services:
- name: backend
  source_dir: /
  dockerfile_path: apps/backend/Dockerfile
  instance_count: 1
  instance_size_slug: basic-xxs
  env:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    value: ${db.DATABASE_URL}
  - key: OPENROUTER_API_KEY
    value: ${OPENROUTER_API_KEY}
  - key: API_KEY
    value: ${API_KEY}

- name: frontend
  source_dir: /
  dockerfile_path: apps/frontend/Dockerfile
  instance_count: 1
  instance_size_slug: basic-xxs
  env:
  - key: NEXT_PUBLIC_SITE_URL
    value: https://smart-summary-app.ondigitalocean.app
  - key: API_URL
    value: ${backend.PRIVATE_URL}

databases:
- name: db
  engine: PG
  version: "15"
```

Deploy:
```bash
doctl apps create --spec app.yaml
```

## Environment Configuration

### Environment Variables Reference

#### Backend Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Application environment |
| `PORT` | No | `3000` | Server port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `OPENROUTER_API_KEY` | Yes* | - | OpenRouter API key |
| `OPENROUTER_DEFAULT_MODEL` | No | `openai/gpt-3.5-turbo` | Default OpenRouter model |
| `OPENAI_API_KEY` | Yes* | - | OpenAI API key (fallback) |
| `OPENAI_DEFAULT_MODEL` | No | `gpt-3.5-turbo` | Default OpenAI model |
| `API_KEY` | Yes | - | Application API key |
| `ALLOWED_ORIGINS` | No | `true` (dev) | CORS allowed origins |

*At least one LLM provider API key is required

#### Frontend Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SITE_URL` | No | `http://localhost:3001` | Public site URL |
| `API_URL` | No | `http://localhost:3000` | Backend API URL |
| `API_KEY` | Yes | - | Application API key |

#### Database Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_USER` | No | `smartsummary` | Database username |
| `POSTGRES_PASSWORD` | Yes | - | Database password |
| `POSTGRES_DB` | No | `smart_summary` | Database name |
| `POSTGRES_PORT` | No | `5432` | Database port |

### Security Configuration

#### API Key Generation
Generate secure API keys:
```bash
# Generate random API key
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Database Security
- Use strong passwords (minimum 16 characters)
- Enable SSL/TLS for database connections in production
- Restrict database access to application servers only
- Regular security updates

#### CORS Configuration
Configure CORS properly for production:
```bash
# Single domain
ALLOWED_ORIGINS=https://yourdomain.com

# Multiple domains
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://api.yourdomain.com
```

## Health Checks and Monitoring

### Health Check Endpoints
- **Backend**: `GET /api/health`
- **Frontend**: `GET /` (Next.js default)

### Docker Health Checks
Health checks are configured in docker-compose.yml:
```yaml
healthcheck:
  test: ['CMD-SHELL', 'curl -f http://localhost:3000/api/health || exit 1']
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Monitoring Setup
Consider implementing:
- **Application Monitoring**: New Relic, DataDog, or Prometheus
- **Log Aggregation**: ELK Stack or Fluentd
- **Error Tracking**: Sentry or Bugsnag
- **Uptime Monitoring**: Pingdom or UptimeRobot

## Backup and Recovery

### Database Backup
```bash
# Create backup
docker-compose exec postgres pg_dump -U smartsummary smart_summary > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U smartsummary smart_summary < backup.sql
```

### Automated Backup Script
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="smart_summary"
DB_USER="smartsummary"

# Create backup
docker-compose exec postgres pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

### Recovery Procedures
1. Stop application services
2. Restore database from backup
3. Run any necessary migrations
4. Restart services
5. Verify functionality

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
docker-compose exec backend pnpm typeorm query "SELECT 1"

# Check database logs
docker-compose logs postgres
```

#### Migration Issues
```bash
# Check migration status
docker-compose exec backend pnpm typeorm migration:show

# Revert last migration
docker-compose exec backend pnpm typeorm migration:revert

# Run specific migration
docker-compose exec backend pnpm typeorm migration:run
```

#### LLM Provider Issues
```bash
# Check LLM service status
curl -H "X-API-Key: your_api_key" http://localhost:3000/api/health

# Test OpenRouter connectivity
curl -H "Authorization: Bearer your_openrouter_key" https://openrouter.ai/api/v1/models
```

#### Frontend Build Issues
```bash
# Clear Next.js cache
rm -rf apps/frontend/.next

# Rebuild frontend
docker-compose build frontend
```

### Log Analysis
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f backend
```

### Performance Monitoring
```bash
# Check container resource usage
docker stats

# Check database performance
docker-compose exec postgres psql -U smartsummary -d smart_summary -c "
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
"
```

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (nginx, HAProxy)
- Multiple backend instances
- Database read replicas
- CDN for static assets

### Vertical Scaling
- Increase container resources
- Database performance tuning
- Redis caching layer
- Connection pooling

### Container Orchestration
Consider Kubernetes for large-scale deployments:
- Pod autoscaling
- Service discovery
- Rolling updates
- Resource management

This deployment guide provides comprehensive instructions for deploying Smart Summary App in various environments with proper security, monitoring, and scaling considerations.

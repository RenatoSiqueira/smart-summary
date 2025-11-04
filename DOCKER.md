# Docker Setup Guide

This document provides instructions for building and running the Smart Summary App using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose 2.0 or higher
- All required environment variables configured

## Quick Start

1. **Create a `.env` file** in the root directory with the following variables:

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

# LLM Provider Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini
# OR
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_DEFAULT_MODEL=gpt-4o-mini

# API Security
API_KEY=your_secure_api_key_here
```

2. **Build and start all services:**

```bash
docker-compose up -d
```

3. **Run database migrations:**

```bash
docker-compose exec backend pnpm --filter @smart-summary/backend migration:run
```

4. **Access the application:**

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000/api

## Commands

### Start services

```bash
docker-compose up -d
```

### Stop services

```bash
docker-compose down
```

### View logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Rebuild services

```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build backend
docker-compose build frontend
```

### Access service shell

```bash
# Backend container
docker-compose exec backend sh

# Frontend container
docker-compose exec frontend sh

# Database container
docker-compose exec postgres psql -U smartsummary -d smart_summary
```

### Run database migrations

```bash
docker-compose exec backend pnpm --filter @smart-summary/backend migration:run
```

### Rollback database migrations

```bash
docker-compose exec backend pnpm --filter @smart-summary/backend migration:revert
```

## Architecture

The Docker setup consists of three main services:

1. **PostgreSQL Database** (`postgres`)
   - Stores application data and analytics
   - Persistent volume for data storage
   - Health checks enabled

2. **NestJS Backend** (`backend`)
   - RESTful API service
   - Connects to PostgreSQL database
   - Handles LLM integration
   - Exposes port 3000

3. **Next.js Frontend** (`frontend`)
   - React application
   - Connects to backend API
   - Exposes port 3001

## Networking

All services are connected via a Docker bridge network (`smart-summary-network`), allowing them to communicate using service names:

- Frontend connects to backend: `http://backend:3000`
- Backend connects to database: `postgres:5432`

## Volume Management

### Persistent Volumes

- `postgres_data`: Stores PostgreSQL database files

### Backup Database

```bash
docker-compose exec postgres pg_dump -U smartsummary smart_summary > backup.sql
```

### Restore Database

```bash
docker-compose exec -T postgres psql -U smartsummary smart_summary < backup.sql
```

## Health Checks

All services include health checks:

- **PostgreSQL**: Checks if database is ready to accept connections
- **Backend**: Checks if the service is listening on port 3000
- **Frontend**: Checks if the service is listening on port 3001

Services wait for dependencies to be healthy before starting.

## Troubleshooting

### Services won't start

1. Check logs: `docker-compose logs -f <service-name>`
2. Verify environment variables are set correctly
3. Ensure ports are not already in use

### Database connection errors

1. Verify `DATABASE_URL` is correctly formatted
2. Check PostgreSQL is healthy: `docker-compose ps`
3. Ensure database credentials match in `.env`

### Build errors

1. Clear Docker cache: `docker-compose build --no-cache`
2. Remove old images: `docker system prune -a`
3. Verify all required files are present

### Frontend can't connect to backend

1. Verify `API_URL` environment variable is set correctly
2. Check backend is healthy: `docker-compose ps backend`
3. Ensure both services are on the same network

## Production Considerations

1. **Security:**
   - Use strong passwords for database and API keys
   - Never commit `.env` files to version control
   - Use Docker secrets for sensitive data in production

2. **Performance:**
   - Consider using Docker Swarm or Kubernetes for orchestration
   - Implement resource limits in `docker-compose.yml`
   - Use a reverse proxy (nginx/traefik) for production

3. **Monitoring:**
   - Add logging aggregation (e.g., ELK stack)
   - Implement health check endpoints
   - Monitor resource usage

4. **Scaling:**
   - Backend can be scaled horizontally
   - Frontend can be scaled horizontally
   - Database should use read replicas for scaling reads

## Clean Up

Remove all containers, volumes, and networks:

```bash
docker-compose down -v
```

Remove all images:

```bash
docker-compose down --rmi all
```

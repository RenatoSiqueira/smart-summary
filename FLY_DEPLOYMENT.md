# Fly.io Deployment Guide

This guide provides step-by-step instructions for deploying the Smart Summary App to Fly.io.

## Quick Start (Automated)

For automated deployment, use the provided script:

```bash
./deploy.sh
```

This interactive script will guide you through:

1. Creating the database
2. Deploying the backend
3. Running migrations
4. Deploying the frontend
5. Configuring CORS

**Optional**: You can pre-fill values using environment variables:

```bash
export OPENROUTER_API_KEY="your-key"
export OPENROUTER_DEFAULT_MODEL="openai/gpt-4o-mini"
export OPENAI_API_KEY="your-key"  # optional
export OPENAI_DEFAULT_MODEL="gpt-4o-mini"  # optional
./deploy.sh
```

**Manual Deployment**: See the sections below for detailed manual steps.

## Prerequisites

1. **Fly.io Account**: Sign up at [fly.io](https://fly.io)
2. **Fly.io CLI**: Install the Fly.io CLI
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```
3. **Fly.io Authentication**: Login to Fly.io
   ```bash
   fly auth login
   ```
4. **PostgreSQL Database**: Create a new PostgreSQL database on Fly.io (see Database Setup section below)

## Architecture Overview

The application is deployed as two separate Fly.io apps:

- **Backend**: `smart-summary-backend` (NestJS API)
- **Frontend**: `smart-summary-frontend` (Next.js application)

Both apps are deployed in the **gru** region (São Paulo, Brazil) and connect to a PostgreSQL database on Fly.io via Flycast (private network).

## Database Setup

### Step 1: Create PostgreSQL Database

Create a new PostgreSQL database on Fly.io:

```bash
fly postgres create --name smart-summary-db --region gru --vm-size shared-cpu-1x --volume-size 10
```

This will:

- Create a PostgreSQL database named `smart-summary-db`
- Deploy it in the `gru` region (São Paulo, Brazil)
- Use shared-cpu-1x VM size (suitable for development/small apps)
- Create a 10GB volume for data storage

**Note**: For production, you may want to use a larger VM size:

```bash
fly postgres create --name smart-summary-db --region gru --vm-size shared-cpu-2x --volume-size 20
```

### Step 2: Get Database Connection Details

After creation, Fly.io will display the connection details. Save these for later:

```bash
# Get connection details
fly postgres connect -a smart-summary-db
```

Or get the connection string:

```bash
fly postgres connect -a smart-summary-db -c
```

You'll see output like:

```
Postgres cluster smart-summary-db created
Username: postgres
Password: <generated-password>
Hostname: smart-summary-db.flycast
Proxy port: 5432
Postgres port: 5433
Connection string: postgres://postgres:<password>@smart-summary-db.flycast:5432
```

**Important**: Save the password and connection string - you'll need them for the backend secrets.

### Step 3: Verify Database Connection

Test the connection:

```bash
fly postgres connect -a smart-summary-db
```

You should see a PostgreSQL prompt. Type `\q` to exit.

## Deployment Steps

### Phase 1: Backend Deployment

#### Step 1: Initialize Backend App

```bash
cd apps/backend
fly launch --name smart-summary-backend --no-deploy --region gru
```

This will create the app but won't deploy yet.

#### Step 2: Set Backend Secrets

Set all required environment variables as secrets:

```bash
# First, generate a secure API key
API_KEY=$(openssl rand -hex 32)

# Then set secrets (replace <password> with the password from database creation)
fly secrets set \
  DATABASE_URL="postgres://postgres:<password>@smart-summary-db.flycast:5432" \
  API_KEY="${API_KEY}" \
  OPENROUTER_API_KEY="your-openrouter-api-key" \
  OPENROUTER_DEFAULT_MODEL="openai/gpt-4o-mini" \
  ALLOWED_ORIGINS="https://smart-summary-frontend.fly.dev" \
  NODE_ENV="production" \
  -a smart-summary-backend
```

**Important Notes:**

- Replace `<password>` with the actual password from the database creation step
- Replace `your-openrouter-api-key` with your actual OpenRouter API key
- The `DATABASE_URL` uses the Flycast hostname (`smart-summary-db.flycast`) for internal networking
- Save the `API_KEY` value - you'll need it for the frontend secrets
- Update `ALLOWED_ORIGINS` after frontend is deployed if the URL is different

**Optional Secrets** (if using OpenAI as fallback):

```bash
fly secrets set \
  OPENAI_API_KEY="your-openai-api-key" \
  OPENAI_DEFAULT_MODEL="gpt-4o-mini" \
  -a smart-summary-backend
```

#### Step 3: Deploy Backend

```bash
fly deploy -a smart-summary-backend
```

This will:

1. Build the Docker image
2. Deploy to Fly.io
3. Start the application

#### Step 4: Run Database Migrations

After successful deployment, run migrations:

```bash
fly ssh console -a smart-summary-backend
```

Then inside the container:

```bash
cd /app/apps/backend
pnpm --filter @smart-summary/backend migration:run
exit
```

#### Step 5: Verify Backend Deployment

Check the health endpoint:

```bash
curl https://smart-summary-backend.fly.dev/api/health
```

Or visit in browser: `https://smart-summary-backend.fly.dev/api/health`

### Phase 2: Frontend Deployment

#### Step 1: Initialize Frontend App

```bash
cd apps/frontend
fly launch --name smart-summary-frontend --no-deploy --region gru
```

#### Step 2: Set Frontend Secrets

Set all required environment variables as secrets:

```bash
# First, get the backend URL (from previous deployment)
BACKEND_URL=$(fly status -a smart-summary-backend | grep "Hostname" | awk '{print $2}' || echo "https://smart-summary-backend.fly.dev")

fly secrets set \
  API_URL="${BACKEND_URL}" \
  API_KEY="your-secure-api-key-here" \
  NEXT_PUBLIC_SITE_URL="https://smart-summary-frontend.fly.dev" \
  NODE_ENV="production" \
  -a smart-summary-frontend
```

**Important Notes:**

- Use the **same** `API_KEY` as the backend
- Use the backend's public URL (or Flycast URL for internal communication)
- Update `NEXT_PUBLIC_SITE_URL` if using a custom domain

#### Step 3: Update Backend CORS Configuration

Update the backend's `ALLOWED_ORIGINS` to include the frontend URL:

```bash
fly secrets set \
  ALLOWED_ORIGINS="https://smart-summary-frontend.fly.dev" \
  -a smart-summary-backend
```

#### Step 4: Deploy Frontend

```bash
fly deploy -a smart-summary-frontend
```

#### Step 5: Verify Frontend Deployment

Visit the frontend URL in your browser:

```
https://smart-summary-frontend.fly.dev
```

### Phase 3: Verify Complete Deployment

1. **Check Backend Health**:

   ```bash
   curl https://smart-summary-backend.fly.dev/api/health
   ```

2. **Check Frontend**:
   - Visit: `https://smart-summary-frontend.fly.dev`
   - Test summarization functionality
   - Test analytics dashboard

3. **Check Logs**:

   ```bash
   # Backend logs
   fly logs -a smart-summary-backend

   # Frontend logs
   fly logs -a smart-summary-frontend
   ```

## CI/CD Setup (GitHub Actions)

### Prerequisites

1. **Fly.io API Token**: Generate deploy tokens for each app

   ```bash
   # Create token for backend
   fly tokens create deploy -a smart-summary-backend
   
   # Create token for frontend (optional - can use same token)
   fly tokens create deploy -a smart-summary-frontend
   ```
   
   **Note:** Copy the entire token output (it's a long string) and save it securely. You can use the backend token for both apps if they're in the same organization.

2. **GitHub Secrets**: Add the token to GitHub
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Add secret: `FLY_API_TOKEN` with the token value

### Automatic Deployment

Once configured, deployments will automatically trigger on:

- Push to `main` or `master` branch
- Changes to backend/frontend code
- Manual trigger via GitHub Actions UI

Workflows:

- `.github/workflows/deploy-backend.yml` - Backend deployment
- `.github/workflows/deploy-frontend.yml` - Frontend deployment

## Manual Deployment Commands

### Backend

```bash
# Deploy
cd apps/backend
fly deploy -a smart-summary-backend

# Check status
fly status -a smart-summary-backend

# View logs
fly logs -a smart-summary-backend

# SSH into container
fly ssh console -a smart-summary-backend

# Run migrations
fly ssh console -a smart-summary-backend -C "cd /app/apps/backend && pnpm --filter @smart-summary/backend migration:run"
```

### Frontend

```bash
# Deploy
cd apps/frontend
fly deploy -a smart-summary-frontend

# Check status
fly status -a smart-summary-frontend

# View logs
fly logs -a smart-summary-frontend
```

## Environment Variables Reference

### Backend Secrets

| Variable                   | Required | Description                                                                                                   |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | Yes      | PostgreSQL connection string (Flycast format: `postgres://postgres:<password>@smart-summary-db.flycast:5432`) |
| `API_KEY`                  | Yes      | Application API key for authentication (generate with: `openssl rand -hex 32`)                                |
| `OPENROUTER_API_KEY`       | Yes\*    | OpenRouter API key                                                                                            |
| `OPENROUTER_DEFAULT_MODEL` | Yes      | Default model for OpenRouter                                                                                  |
| `ALLOWED_ORIGINS`          | Yes      | CORS allowed origins (comma-separated, e.g., `https://smart-summary-frontend.fly.dev`)                        |
| `NODE_ENV`                 | Yes      | Environment (production)                                                                                      |
| `OPENAI_API_KEY`           | No       | OpenAI API key (fallback)                                                                                     |
| `OPENAI_DEFAULT_MODEL`     | No       | Default model for OpenAI                                                                                      |

**Getting Database Connection String:**
After creating the database, you can get the connection string:

```bash
fly postgres connect -a smart-summary-db -c
```

Or manually construct it:

```
postgres://postgres:<password>@smart-summary-db.flycast:5432
```

Replace `<password>` with the password shown when creating the database.

\*At least one LLM provider API key is required

### Frontend Secrets

| Variable               | Required | Description                           |
| ---------------------- | -------- | ------------------------------------- |
| `API_URL`              | Yes      | Backend API URL (public or Flycast)   |
| `API_KEY`              | Yes      | Application API key (same as backend) |
| `NEXT_PUBLIC_SITE_URL` | Yes      | Public frontend URL                   |
| `NODE_ENV`             | Yes      | Environment (production)              |

## Database Connection

The backend connects to PostgreSQL using Flycast (private network):

```
postgres://postgres:<password>@smart-summary-db.flycast:5432
```

Replace `<password>` with the password from when you created the database.

**Benefits of Flycast:**

- Internal networking (faster, more secure)
- No public exposure
- SSL enabled by default

**Note**: If you haven't created the database yet, see the [Database Setup](#database-setup) section above.

## Troubleshooting

### Backend Issues

**Problem**: Database connection fails

```bash
# Check database status
fly status -a smart-summary-db

# Verify DATABASE_URL secret
fly secrets list -a smart-summary-backend

# Test connection from backend
fly ssh console -a smart-summary-backend
# Then: psql $DATABASE_URL
```

**Problem**: Health check fails

```bash
# Check logs
fly logs -a smart-summary-backend

# Verify app is running
fly status -a smart-summary-backend

# Check if port is correct
fly ssh console -a smart-summary-backend
# Then: curl http://localhost:3000/api/health
```

### Frontend Issues

**Problem**: Cannot connect to backend

```bash
# Verify API_URL secret
fly secrets list -a smart-summary-frontend

# Check backend is accessible
curl https://smart-summary-backend.fly.dev/api/health

# Update API_URL if needed
fly secrets set API_URL="https://smart-summary-backend.fly.dev" -a smart-summary-frontend
```

**Problem**: CORS errors

```bash
# Update ALLOWED_ORIGINS in backend
fly secrets set ALLOWED_ORIGINS="https://smart-summary-frontend.fly.dev" -a smart-summary-backend
```

### Migration Issues

**Problem**: Migrations fail

```bash
# Check migration status
fly ssh console -a smart-summary-backend
cd /app/apps/backend
pnpm --filter @smart-summary/backend typeorm migration:show

# Run migrations manually
pnpm --filter @smart-summary/backend migration:run
```

## Scaling

### Horizontal Scaling

Scale backend instances:

```bash
fly scale count 2 -a smart-summary-backend
```

Scale frontend instances:

```bash
fly scale count 2 -a smart-summary-frontend
```

### Vertical Scaling

Increase memory/CPU:

```bash
# Backend
fly scale vm shared-cpu-2x --memory 1024 -a smart-summary-backend

# Frontend
fly scale vm shared-cpu-2x --memory 1024 -a smart-summary-frontend
```

## Monitoring

### View Logs

```bash
# Real-time logs
fly logs -a smart-summary-backend
fly logs -a smart-summary-frontend

# Historical logs
fly logs -a smart-summary-backend --recent
```

### Check Status

```bash
# App status
fly status -a smart-summary-backend
fly status -a smart-summary-frontend

# Machine status
fly machine list -a smart-summary-backend
```

## Custom Domain Setup

1. **Add Domain to Frontend**:

   ```bash
   fly certs add yourdomain.com -a smart-summary-frontend
   ```

2. **Update Secrets**:

   ```bash
   # Frontend
   fly secrets set NEXT_PUBLIC_SITE_URL="https://yourdomain.com" -a smart-summary-frontend

   # Backend
   fly secrets set ALLOWED_ORIGINS="https://yourdomain.com" -a smart-summary-backend
   ```

3. **Redeploy**:
   ```bash
   fly deploy -a smart-summary-frontend
   fly deploy -a smart-summary-backend
   ```

## Security Checklist

- [ ] All secrets set via `fly secrets set` (not in code)
- [ ] Strong API keys generated
- [ ] CORS configured correctly
- [ ] Database uses Flycast (internal network)
- [ ] SSL/TLS enabled (automatic with Fly.io)
- [ ] Health checks configured
- [ ] Monitoring and logging enabled

## Cost Optimization

- **Auto-stop machines**: Enabled (apps stop when idle)
- **Auto-start machines**: Enabled (apps start on request)
- **Minimum machines**: 1 (for zero downtime)
- **Resource allocation**: Start with shared-cpu-1x, 512MB RAM

## Support

For issues or questions:

- Fly.io Documentation: https://fly.io/docs
- Fly.io Community: https://community.fly.io
- Fly.io Status: https://status.fly.io

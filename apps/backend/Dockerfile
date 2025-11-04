# Backend Dockerfile - NestJS Application
FROM node:18-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@7.0.0 --activate

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages/types ./packages/types

# Copy backend app
COPY apps/backend ./apps/backend

# Install dependencies
FROM base AS deps
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

# Build the types package first (required dependency for backend)
RUN pnpm --filter @smart-summary/types build

# Build the application
RUN pnpm --filter @smart-summary/backend build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

# Install pnpm and netcat for health checks
RUN corepack enable && corepack prepare pnpm@7.0.0 --activate && \
    apk add --no-cache netcat-openbsd

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/turbo.json ./

# Copy built packages
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Change ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
WORKDIR /app/apps/backend
CMD ["node", "dist/main.js"]


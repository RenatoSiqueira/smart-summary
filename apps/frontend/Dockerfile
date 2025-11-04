# Frontend Dockerfile - Next.js Application
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

# Copy frontend app
COPY apps/frontend ./apps/frontend

# Install dependencies
FROM base AS deps
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules

# Set build-time environment variables
ARG NEXT_PUBLIC_SITE_URL
ARG API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV API_URL=$API_URL

# Build the types package first (required dependency for frontend)
RUN pnpm --filter @smart-summary/types build

# Build the Next.js application
RUN pnpm --filter @smart-summary/frontend build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

# Install pnpm and netcat for health checks
RUN corepack enable && corepack prepare pnpm@7.0.0 --activate && \
    apk add --no-cache netcat-openbsd

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/turbo.json ./

# Copy built packages and application
# Next.js standalone output includes node_modules and server.js
# The standalone output mirrors the workspace structure
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
# Copy public folder (ensure it exists - created empty if needed)
RUN mkdir -p ./apps/frontend/public
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

# Change ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Start the application
# Next.js standalone creates server.js inside apps/frontend/ in the standalone output
WORKDIR /app/apps/frontend
CMD ["node", "server.js"]


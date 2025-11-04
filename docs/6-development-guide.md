# Development Guide

## Overview

This guide provides comprehensive information for developers working on Smart Summary App, including setup instructions, development workflows, coding standards, and contribution guidelines.

## Development Environment Setup

### Prerequisites
- **Node.js**: >= 18.0.0 (recommend using nvm for version management)
- **pnpm**: >= 9.0.0 (package manager)
- **PostgreSQL**: 15+ (for local database)
- **Git**: Latest version
- **VS Code**: Recommended IDE with extensions

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-json",
    "ms-vscode.vscode-docker",
    "ms-vscode.vscode-postgresql"
  ]
}
```

### Initial Setup

#### 1. Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd Smart-Summary-App

# Install dependencies
pnpm install

# Verify installation
pnpm --version
node --version
```

#### 2. Database Setup
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE smart_summary;
CREATE USER smartsummary WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE smart_summary TO smartsummary;
\q
```

#### 3. Environment Configuration
Create environment files for local development:

**Root `.env.local`:**
```bash
# Database Configuration
POSTGRES_USER=smartsummary
POSTGRES_PASSWORD=dev_password
POSTGRES_DB=smart_summary
POSTGRES_PORT=5432
DATABASE_URL=postgresql://smartsummary:dev_password@localhost:5432/smart_summary

# LLM Configuration (get from providers)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini

# API Security (development key)
API_KEY=dev_api_key_12345

# Development URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3001
API_URL=http://localhost:3000
```

**apps/backend/.env.local:**
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://smartsummary:dev_password@localhost:5432/smart_summary
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini
API_KEY=dev_api_key_12345
```

**apps/frontend/.env.local:**
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3001
API_URL=http://localhost:3000
API_KEY=dev_api_key_12345
```

#### 4. Database Migration
```bash
# Run initial migrations
cd apps/backend
pnpm migration:run

# Verify migration status
pnpm typeorm migration:show
```

#### 5. Start Development Servers
```bash
# Start all services (from root)
pnpm dev

# Or start individually
pnpm --filter @smart-summary/backend dev
pnpm --filter @smart-summary/frontend dev
```

## Project Structure

### Monorepo Architecture
```
Smart-Summary-App/
├── apps/                    # Applications
│   ├── backend/            # NestJS backend
│   └── frontend/           # Next.js frontend
├── packages/               # Shared packages
│   └── types/             # Shared TypeScript types
├── docs/                  # Documentation
├── docker-compose.yml     # Container orchestration
├── turbo.json            # Turborepo configuration
├── pnpm-workspace.yaml   # pnpm workspace configuration
└── package.json          # Root package.json
```

### Backend Structure (NestJS)
```
apps/backend/src/
├── app.module.ts          # Root module
├── main.ts               # Application bootstrap
├── config/               # Configuration management
│   ├── configuration.ts  # App configuration
│   ├── config.interface.ts # Config types
│   └── env.validation.ts # Environment validation
├── database/             # Database configuration
│   ├── database.module.ts # Database module
│   ├── typeorm.config.ts # TypeORM configuration
│   └── migrations/       # Database migrations
├── common/               # Shared utilities
│   ├── decorators/       # Custom decorators
│   ├── guards/          # Authentication guards
│   └── interceptors/    # Request/response interceptors
├── summary/              # Summary feature module
│   ├── summary.module.ts
│   ├── summary.controller.ts
│   ├── summary.service.ts
│   ├── entities/        # Database entities
│   └── dto/            # Data transfer objects
├── analytics/           # Analytics feature module
├── llm/                # LLM service abstraction
└── health/             # Health check endpoints
```

### Frontend Structure (Next.js)
```
apps/frontend/src/
├── app/                  # Next.js App Router
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   ├── analytics/       # Analytics pages
│   └── summarize/       # Summarization components
├── shared/              # Shared components and utilities
│   ├── components/      # Reusable UI components
│   │   ├── ui/         # Base UI components (shadcn/ui)
│   │   └── ...         # Feature components
│   ├── lib/            # Utility functions
│   └── hooks/          # Custom React hooks
└── styles/             # Global styles
```

## Development Workflow

### Git Workflow
We use a feature branch workflow with the following conventions:

#### Branch Naming
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Critical fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

#### Commit Messages
Follow conventional commits format:
```
type(scope): description

[optional body]

[optional footer]
```

Examples:
```bash
feat(summary): add streaming summarization endpoint
fix(analytics): resolve date filtering issue
docs(api): update endpoint documentation
refactor(llm): improve error handling
```

#### Development Process
1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Write/update tests
4. Update documentation if needed
5. Create pull request
6. Code review and approval
7. Merge to `main`

### Code Quality Tools

#### ESLint Configuration
```json
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

#### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

#### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

## Development Commands

### Root Level Commands
```bash
# Install dependencies
pnpm install

# Start all services in development
pnpm dev

# Build all applications
pnpm build

# Run linting across all packages
pnpm lint

# Run tests across all packages
pnpm test

# Format code across all packages
pnpm format

# Clean build artifacts
pnpm clean
```

### Backend Commands
```bash
# Navigate to backend
cd apps/backend

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start:prod

# Run tests
pnpm test
pnpm test:watch
pnpm test:cov

# Database operations
pnpm migration:generate -- -n MigrationName
pnpm migration:run
pnpm migration:revert

# TypeORM CLI
pnpm typeorm --help
```

### Frontend Commands
```bash
# Navigate to frontend
cd apps/frontend

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test
pnpm test:watch
pnpm test:ui

# Type checking
pnpm type-check
```

## Testing Strategy

### Backend Testing (Jest)

#### Unit Tests
```typescript
// apps/backend/src/summary/summary.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SummaryService } from './summary.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SummaryRequest } from './entities/summary-request.entity';

describe('SummaryService', () => {
  let service: SummaryService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryService,
        {
          provide: getRepositoryToken(SummaryRequest),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SummaryService>(SummaryService);
  });

  it('should create a summary request', async () => {
    const mockRequest = { id: '1', text: 'test' };
    mockRepository.create.mockReturnValue(mockRequest);
    mockRepository.save.mockResolvedValue(mockRequest);

    const result = await service.createSummaryRequest('test');
    expect(result).toEqual(mockRequest);
  });
});
```

#### Integration Tests
```typescript
// apps/backend/src/summary/summary.controller.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('SummaryController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/summary (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/summary')
      .set('X-API-Key', 'test-key')
      .send({ text: 'Test text to summarize' })
      .expect(200);
  });
});
```

### Frontend Testing (Vitest + Testing Library)

#### Component Tests
```typescript
// apps/frontend/src/app/summarize/components/SummarizeForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SummarizeForm } from './SummarizeForm';

describe('SummarizeForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders form elements', () => {
    render(<SummarizeForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/your content/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate smart summary/i })).toBeInTheDocument();
  });

  it('calls onSubmit with form data', async () => {
    render(<SummarizeForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByLabelText(/your content/i);
    const submitButton = screen.getByRole('button', { name: /generate smart summary/i });

    fireEvent.change(textarea, { target: { value: 'Test text' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('Test text');
    });
  });
});
```

#### Hook Tests
```typescript
// apps/frontend/src/app/summarize/hooks/useStreamingSummary.test.ts
import { renderHook, act } from '@testing-library/react';
import { useStreamingSummary } from './useStreamingSummary';

// Mock SSE client
jest.mock('@/shared/lib/sse-client', () => ({
  createPostSSEConnection: jest.fn(),
}));

describe('useStreamingSummary', () => {
  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useStreamingSummary());
    
    expect(result.current.state).toEqual({
      summary: '',
      isStreaming: false,
      isComplete: false,
    });
  });

  it('updates state when streaming starts', () => {
    const { result } = renderHook(() => useStreamingSummary());
    
    act(() => {
      result.current.startStreaming('test text');
    });

    expect(result.current.state.isStreaming).toBe(true);
  });
});
```

### Test Configuration

#### Vitest Configuration (Frontend)
```typescript
// apps/frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### Jest Configuration (Backend)
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": ["ts-jest", { "tsconfig": "tsconfig.spec.json" }]
  },
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node",
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/$1"
  }
}
```

## Debugging

### Backend Debugging

#### VS Code Debug Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/apps/backend/src/main.ts",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/apps/backend/dist/**/*.js"],
      "envFile": "${workspaceFolder}/apps/backend/.env.local",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

#### Debug Commands
```bash
# Start backend in debug mode
cd apps/backend
pnpm start:debug

# Debug tests
pnpm test:debug
```

### Frontend Debugging

#### Browser DevTools
- Use React Developer Tools extension
- Enable source maps for debugging
- Use Network tab for API debugging

#### Debug Hooks
```typescript
// Custom debug hook
import { useEffect } from 'react';

export function useDebugValue(value: any, label: string) {
  useEffect(() => {
    console.log(`[${label}]:`, value);
  }, [value, label]);
}

// Usage in components
const { state } = useStreamingSummary();
useDebugValue(state, 'StreamingSummary State');
```

## Database Development

### Migration Workflow
```bash
# Generate new migration
cd apps/backend
pnpm migration:generate -- -n AddNewFeature

# Review generated migration file
# Edit if necessary

# Run migration
pnpm migration:run

# Revert if needed
pnpm migration:revert
```

### Database Seeding
```typescript
// apps/backend/src/database/seeds/summary-requests.seed.ts
import { DataSource } from 'typeorm';
import { SummaryRequest } from '../../summary/entities/summary-request.entity';

export async function seedSummaryRequests(dataSource: DataSource) {
  const repository = dataSource.getRepository(SummaryRequest);
  
  const sampleRequests = [
    {
      text: 'Sample text for testing...',
      summary: 'Sample summary...',
      tokensUsed: 100,
      cost: 0.002,
      completedAt: new Date(),
    },
    // Add more sample data
  ];

  await repository.save(sampleRequests);
}
```

### Database Testing
```typescript
// Use in-memory database for tests
const testDataSource = new DataSource({
  type: 'sqlite',
  database: ':memory:',
  entities: [SummaryRequest],
  synchronize: true,
});
```

## Performance Optimization

### Backend Performance
- Use database indexes effectively
- Implement connection pooling
- Cache frequently accessed data
- Optimize database queries
- Use streaming for large responses

### Frontend Performance
- Implement code splitting
- Optimize bundle size
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Optimize images and assets

### Monitoring
```typescript
// Performance monitoring middleware
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${duration}ms`);
  });
  
  next();
}
```

## Contributing Guidelines

### Code Style
- Follow TypeScript best practices
- Use meaningful variable and function names
- Write self-documenting code
- Add comments for complex logic
- Follow established patterns in the codebase

### Pull Request Process
1. Create feature branch from `main`
2. Make changes with clear commits
3. Add/update tests
4. Update documentation
5. Ensure all tests pass
6. Create pull request with description
7. Address review feedback
8. Merge after approval

### Code Review Checklist
- [ ] Code follows project conventions
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No console.log statements in production code
- [ ] Error handling is appropriate
- [ ] Performance impact is considered
- [ ] Security implications are reviewed

## Troubleshooting

### Common Development Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000
lsof -i :3001

# Kill process
kill -9 <PID>
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
brew services list | grep postgresql
sudo systemctl status postgresql

# Reset database
dropdb smart_summary
createdb smart_summary
pnpm migration:run
```

#### Node Modules Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

#### TypeScript Issues
```bash
# Clear TypeScript cache
rm -rf apps/frontend/.next
rm -rf apps/backend/dist
pnpm build
```

This development guide provides comprehensive information for developers to effectively work on Smart Summary App with proper setup, workflows, and best practices.

# Testing & Quality

## Overview

This document outlines the testing strategy, quality assurance measures, code coverage policies, and testing best practices for the Smart Summary App.

## Testing Strategy

### Test Pyramid

The testing strategy follows a **test pyramid** approach:

```
        ┌─────────┐
        │   E2E   │  Fewer, expensive tests
        │  Tests  │
        ├─────────┤
        │Integration│  More, moderate cost
        │   Tests   │
        ├─────────┤
        │   Unit   │  Many, cheap tests
        │  Tests   │
        └─────────┘
```

### Test Types

1. **Unit Tests**: Fast, isolated tests for individual functions/classes
2. **Integration Tests**: Test interactions between components
3. **End-to-End Tests**: Full system tests from user perspective
4. **Contract Tests**: Verify API contracts between frontend and backend

## Backend Testing

### Unit Tests

**Location**: `apps/backend/src/**/__tests__/`

**Framework**: Jest (default NestJS testing setup)

**Test Files**:

- `summary.service.spec.ts`
- `analytics.service.spec.ts`
- `llm.service.spec.ts`
- `api-key.guard.spec.ts`
- `base-llm.service.spec.ts`

**Example Unit Test**:

```typescript
describe('SummaryService', () => {
  let service: SummaryService;
  let repository: Repository<SummaryRequest>;
  let llmService: LLMService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryService,
        {
          provide: getRepositoryToken(SummaryRequest),
          useValue: mockRepository,
        },
        {
          provide: LLMService,
          useValue: mockLLMService,
        },
      ],
    }).compile();

    service = module.get<SummaryService>(SummaryService);
    repository = module.get(getRepositoryToken(SummaryRequest));
    llmService = module.get<LLMService>(LLMService);
  });

  describe('createSummaryRequest', () => {
    it('should create a summary request', async () => {
      const text = 'Sample text';
      const clientIp = '127.0.0.1';

      const result = await service.createSummaryRequest(text, clientIp);

      expect(result.text).toBe(text);
      expect(result.clientIp).toBe(clientIp);
      expect(result.tokensUsed).toBe(0);
      expect(result.cost).toBe(0);
    });
  });
});
```

**Test Coverage Targets**:

- Services: 80%+ line coverage
- Controllers: 70%+ line coverage
- Guards/Interceptors: 90%+ line coverage

### Integration Tests

**Framework**: Jest with NestJS testing utilities

**Test Areas**:

1. **Database Integration**: Test repository operations with real database
2. **LLM Integration**: Mock LLM provider responses
3. **API Integration**: Test full request/response cycle

**Example Integration Test**:

```typescript
describe('SummaryController (integration)', () => {
  let app: INestApplication;
  let repository: Repository<SummaryRequest>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(testDbConfig), SummaryModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    repository = moduleFixture.get(getRepositoryToken(SummaryRequest));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/summary should stream summary', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/summary')
      .set('X-API-Key', 'test-api-key')
      .send({ text: 'Sample text' })
      .expect(200)
      .expect('Content-Type', /text\/event-stream/);

    // Verify streaming response
  });
});
```

### Test Utilities

**Mock Factories**: Create mock objects for testing

```typescript
export function createMockSummaryRequest(
  overrides?: Partial<SummaryRequest>,
): SummaryRequest {
  return {
    id: 'test-id',
    text: 'Test text',
    summary: null,
    clientIp: '127.0.0.1',
    tokensUsed: 0,
    cost: 0,
    createdAt: new Date(),
    completedAt: null,
    error: null,
    ...overrides,
  };
}
```

**Test Database**: Use test database configuration

```typescript
export const testDbConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.TEST_DATABASE_URL,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true, // Only for tests
  dropSchema: true, // Clean between tests
};
```

## Frontend Testing

### Unit Tests

**Framework**: Vitest (configured in project)

**Location**: `apps/frontend/src/**/__tests__/`

**Test Areas**:

- React hooks (`useStreamingSummary`)
- Utility functions (`sse-client`, `http-client`)
- Server actions
- Component logic (non-UI)

**Example Hook Test**:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useStreamingSummary } from './useStreamingSummary';

describe('useStreamingSummary', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useStreamingSummary());

    expect(result.current.state.summary).toBe('');
    expect(result.current.state.isStreaming).toBe(false);
    expect(result.current.state.isComplete).toBe(false);
  });

  it('should update state on chunk arrival', async () => {
    const { result } = renderHook(() => useStreamingSummary());

    await act(async () => {
      await result.current.startStreaming('Test text');
      // Mock SSE chunk events
    });

    expect(result.current.state.isStreaming).toBe(true);
  });
});
```

### Component Tests

**Framework**: React Testing Library

**Test Areas**:

- Component rendering
- User interactions
- State updates
- Props handling

**Example Component Test**:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { SummarizeForm } from './SummarizeForm';

describe('SummarizeForm', () => {
  it('should render form', () => {
    const onSubmit = jest.fn();
    render(<SummarizeForm onSubmit={onSubmit} isStreaming={false} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should call onSubmit with text', () => {
    const onSubmit = jest.fn();
    render(<SummarizeForm onSubmit={onSubmit} isStreaming={false} />);

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'Test text' } });
    fireEvent.click(button);

    expect(onSubmit).toHaveBeenCalledWith('Test text');
  });
});
```

### Integration Tests

**Framework**: Playwright or Cypress (recommended)

**Test Areas**:

- Full user flows
- API interactions
- SSE streaming
- Analytics dashboard

**Example E2E Test** (Playwright):

```typescript
import { test, expect } from '@playwright/test';

test('should summarize text', async ({ page }) => {
  await page.goto('http://localhost:3001');

  // Enter text
  await page.fill('textarea', 'Sample text to summarize');

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for streaming to start
  await expect(page.locator('[data-testid="summary"]')).toBeVisible();

  // Wait for completion
  await expect(page.locator('[data-testid="summary"]')).toContainText(
    'summary content',
  );
});
```

## Test Coverage

### Coverage Targets

**Backend**:

- Services: 80%+ line coverage
- Controllers: 70%+ line coverage
- Guards/Interceptors: 90%+ line coverage
- Utilities: 85%+ line coverage

**Frontend**:

- Hooks: 80%+ line coverage
- Components: 70%+ line coverage
- Utilities: 85%+ line coverage
- Server Actions: 75%+ line coverage

### Coverage Reports

**Framework**: Jest/Vitest with coverage reporters

**Generate Reports**:

```bash
# Backend
cd apps/backend
npm test -- --coverage

# Frontend
cd apps/frontend
npm test -- --coverage
```

**Coverage Formats**:

- HTML: `coverage/index.html`
- JSON: `coverage/coverage-final.json`
- LCOV: `coverage/lcov.info`

## Testing Best Practices

### Unit Testing

1. **Test One Thing**: Each test should verify one behavior
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Descriptive Names**: Test names should describe what they test
4. **Mock Dependencies**: Mock external dependencies
5. **Test Edge Cases**: Test boundary conditions and error cases

### Integration Testing

1. **Test Real Interactions**: Use real database for integration tests
2. **Clean State**: Reset database between tests
3. **Test Data Factories**: Use factories for test data
4. **Test Error Paths**: Verify error handling

### E2E Testing

1. **Critical Paths**: Focus on critical user flows
2. **Realistic Data**: Use realistic test data
3. **Parallel Execution**: Run tests in parallel when possible
4. **Flakiness**: Handle async operations properly

## Test Utilities

### Mock Factories

**Location**: `apps/backend/src/**/__tests__/factories/`

```typescript
export function createMockSummaryRequest(
  overrides?: Partial<SummaryRequest>,
): SummaryRequest {
  return {
    id: 'test-id',
    text: 'Test text',
    // ... defaults
    ...overrides,
  };
}
```

### Test Helpers

**Location**: `apps/backend/src/**/__tests__/helpers/`

```typescript
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}
```

## Quality Assurance

### Code Quality

**Linting**: ESLint for TypeScript/JavaScript

**Configuration**: Project-specific ESLint configs

**Run Linting**:

```bash
npm run lint
```

### Type Safety

**TypeScript**: Strict type checking enabled

**Configuration**: `tsconfig.json` with strict mode

**Benefits**:

- Catch errors at compile time
- Better IDE support
- Self-documenting code

### Code Formatting

**Tool**: Prettier (if configured)

**Configuration**: `.prettierrc` or `prettier.config.js`

**Run Formatting**:

```bash
npm run format
```

## CI/CD Integration

### Continuous Integration

**Recommended Workflow**:

1. **Lint**: Run linters on all files
2. **Type Check**: Run TypeScript compiler
3. **Unit Tests**: Run unit tests
4. **Integration Tests**: Run integration tests
5. **Coverage**: Generate coverage reports
6. **E2E Tests**: Run E2E tests (optional, can be on schedule)

**Example GitHub Actions Workflow**:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Unit tests
        run: npm run test:unit

      - name: Integration tests
        run: npm run test:integration
        env:
          TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

      - name: Coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Testing Assumptions

1. **Test Database**: Separate test database used for integration tests
2. **Mock LLM Providers**: LLM providers mocked in unit tests
3. **Test Data**: Test data factories used for consistent test data
4. **Clean State**: Database/reset between tests
5. **Fast Tests**: Unit tests run quickly (< 100ms each)
6. **Isolated Tests**: Tests don't depend on execution order

## Recommendations

### Testing Improvements

1. **Increase Coverage**: Aim for 80%+ overall coverage
2. **E2E Tests**: Add E2E tests for critical paths
3. **Performance Tests**: Add performance/load tests
4. **Contract Tests**: Add API contract tests
5. **Visual Regression**: Consider visual regression testing

### Testing Priorities

1. **High Priority**: Core business logic (SummaryService, AnalyticsService)
2. **Medium Priority**: Controllers, Guards, Interceptors
3. **Lower Priority**: Utilities, helpers

### Test Maintenance

1. **Keep Tests Updated**: Update tests when code changes
2. **Remove Obsolete Tests**: Remove tests for deleted features
3. **Refactor Tests**: Refactor tests when code is refactored
4. **Document Test Utilities**: Document custom test utilities

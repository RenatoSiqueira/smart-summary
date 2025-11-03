# Security & Compliance

## Overview

This document outlines the security measures, authentication mechanisms, authorization patterns, and compliance considerations for the Smart Summary App.

## Authentication & Authorization

### API Key Authentication

**Implementation**: Server-to-server authentication via API key

The application uses API key-based authentication for backend API access. API keys are never exposed to the client browser.

**Backend Guard**:

```1:44:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/common/guards/api-key.guard.ts
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService<{ app: AppConfig }>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    const validApiKey = this.configService.get<AppConfig>('app')?.apiKey;

    if (!validApiKey) {
      throw new UnauthorizedException('API key validation is not configured');
    }

    if (apiKey !== validApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  private extractApiKey(request: Request): string {
    const headerKey = request.headers['x-api-key'];

    if (headerKey && typeof headerKey === 'string') {
      return headerKey;
    }

    throw new UnauthorizedException('API key is missing');
  }
}
```

**Usage**: Applied at controller level via `@UseGuards(ApiKeyGuard)`

```1:111:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/summary/summary.controller.ts
@Controller('summary')
@UseGuards(ApiKeyGuard)
export class SummaryController {
  // ...
}
```

### Frontend API Key Management

**Server-Side Only**: API keys are never exposed to the client

1. **API Route Proxy**: Next.js API route injects API key server-side

```1:90:/home/renato-siqueira/Projects/Smart-Summary-App/apps/frontend/src/app/api/summarize/route.ts
export async function POST(request: NextRequest) {
  // ...
  const apiKey = getApiKey(); // Server-side only
  const backendUrl = `${BACKEND_URL}/api/summary`;

  const response = await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey, // Added server-side
    },
    body: JSON.stringify({ text }),
  });
  // ...
}
```

2. **Server Actions**: Server actions use API key for backend calls

```1:50:/home/renato-siqueira/Projects/Smart-Summary-App/apps/frontend/src/app/analytics/actions/get-analytics.action.ts
'use server';

export async function getAnalyticsAction(filters?: {
  startDate?: Date | string;
  endDate?: Date | string;
  clientIp?: string;
}): Promise<{ success: boolean; data?: AnalyticsMetrics; error?: string }> {
  try {
    const apiKey = getApiKey(); // Server-side only

    const data = await fetchFromBackend<AnalyticsMetrics>(url, {
      apiKey,
      method: 'GET',
    });

    return { success: true, data };
  } catch (error) {
    // Error handling
  }
}
```

### API Key Extraction

**Header Format**: `X-API-Key: <api-key>`

**Validation**:

- Key must be present in request headers
- Key must match configured backend key
- Missing key → 401 Unauthorized
- Invalid key → 401 Unauthorized

## Input Validation

### DTO Validation

**Framework**: `class-validator` decorators

**Global Validation Pipe**:

```1:43:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

**Validation Behavior**:

- `whitelist: true`: Strip unknown properties
- `forbidNonWhitelisted: true`: Reject requests with unknown properties
- `transform: true`: Automatically transform DTOs to instances

**Example DTO**:

```typescript
export class SummarizeRequestDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}
```

### Input Sanitization

**Text Input**: User-provided text is stored as-is (no sanitization)

**Considerations**:

- Text may contain HTML, scripts, or other content
- Text is stored in database as-is
- Text is passed to LLM providers without sanitization
- Frontend should handle XSS prevention when displaying user input

**Recommendations**:

- Implement input length limits (max text size)
- Consider sanitizing HTML content if displaying in UI
- Validate text encoding (UTF-8)

## Security Headers

### Helmet Middleware

**Framework**: `helmet` for HTTP security headers

```1:43:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/main.ts
app.use(helmet());
```

**Headers Applied** (default Helmet configuration):

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (if HTTPS)

### CORS Configuration

**Configuration**:

```1:43:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/main.ts
app.enableCors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
});
```

**Current Settings**:

- `origin: true`: Allows all origins (⚠️ restrict in production)
- `credentials: true`: Allows cookies/credentials
- Methods: Standard HTTP methods
- Headers: Required headers for API

**Production Recommendation**:

```typescript
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
});
```

## Network Security

### HTTPS/TLS

**Requirement**: All external communication over HTTPS

**Implementation**:

- Production deployments should use HTTPS
- TLS certificates managed by hosting provider (Vercel, AWS, etc.)
- Backend should enforce HTTPS redirects

### Database Security

**Connection**: PostgreSQL connection via `DATABASE_URL`

**SSL Configuration**:

```1:35:/home/renato-siqueira/Projects/Smart-Summary-App/apps/backend/src/database/database.module.ts
ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
```

**Considerations**:

- `rejectUnauthorized: false` accepts self-signed certificates
- Consider stricter SSL validation in production
- Use connection pooling for production

### SQL Injection Prevention

**Framework**: TypeORM parameterized queries

**Implementation**: All queries use parameterized bindings

```typescript
queryBuilder.where('request.createdAt >= :startDate', { startDate });
```

**Protection**: TypeORM automatically escapes parameters, preventing SQL injection

## Data Security

### Environment Variables

**Storage**: Environment variables for sensitive data

**Backend Variables**:

- `API_KEY`: Backend API key
- `DATABASE_URL`: PostgreSQL connection string
- `OPENROUTER_API_KEY`: OpenRouter API key
- `OPENAI_API_KEY`: OpenAI API key

**Frontend Variables**:

- `API_URL`: Backend API URL (public)
- `API_KEY`: Backend API key (server-side only)
- `NEXT_PUBLIC_SITE_URL`: Public site URL

**Best Practices**:

- Never commit `.env` files to version control
- Use `.env.local` for local development
- Use secure secret management in production (AWS Secrets Manager, Vercel Secrets, etc.)
- Rotate API keys periodically

### Data Encryption

**At Rest**: Database encryption depends on PostgreSQL configuration

**Recommendations**:

- Enable PostgreSQL encryption at rest (managed services handle this)
- Consider encrypting sensitive text fields if required
- Implement field-level encryption for PII if needed

**In Transit**: HTTPS/TLS for all external communication

### PII Handling

**Data Stored**:

- `text`: User input (may contain PII)
- `summary`: Generated summary (may reference PII)
- `client_ip`: Client IP address

**Considerations**:

- Text may contain personally identifiable information
- Client IP is logged for analytics
- No automatic PII detection or redaction

**Recommendations**:

- Implement data retention policies
- Consider encryption for `text` field
- Anonymize or hash client IPs if privacy concerns arise
- Provide data deletion capabilities (GDPR compliance)
- Audit access to raw text data

## Error Handling Security

### Error Messages

**Current Implementation**: Error messages may expose internal details

**Example**:

```typescript
throw new Error(`Failed to create summary request: ${error.message}`);
```

**Recommendations**:

- Sanitize error messages for client responses
- Log detailed errors server-side only
- Return generic error messages to clients
- Avoid exposing stack traces in production

### Logging

**Current Implementation**: Console logging for errors

**Recommendations**:

- Use structured logging (Winston, Pino)
- Avoid logging sensitive data (API keys, PII)
- Implement log rotation and retention
- Monitor logs for security events

## Compliance Considerations

### GDPR Compliance

**Applicable**: If serving EU users

**Requirements**:

1. **Right to Access**: Users can request their data
2. **Right to Deletion**: Users can request data deletion
3. **Data Portability**: Users can export their data
4. **Privacy Policy**: Clear privacy policy required

**Current State**:

- ❌ No user data export functionality
- ❌ No user data deletion functionality
- ❌ No privacy policy (assumed external)
- ✅ API key-based access control (no user accounts)

**Recommendations**:

- Implement user data export endpoint
- Implement data deletion endpoint
- Add privacy policy page
- Implement consent management if collecting user data

### PCI DSS Compliance

**Not Applicable**: No payment card data stored or processed

### HIPAA Compliance

**Not Applicable**: No healthcare data processed (unless specifically configured)

**If Required**:

- Implement encryption at rest for all data
- Implement access controls and audit logging
- Sign Business Associate Agreements (BAAs) with vendors
- Implement data retention and deletion policies

## Security Best Practices

### Code Security

1. **Dependency Scanning**: Regularly scan dependencies for vulnerabilities

   ```bash
   npm audit
   npm audit fix
   ```

2. **Type Safety**: TypeScript prevents many runtime errors

3. **Input Validation**: All inputs validated via DTOs

4. **Output Encoding**: Frontend should encode user-generated content

### Infrastructure Security

1. **Secrets Management**: Use secure secret management (AWS Secrets Manager, HashiCorp Vault)

2. **Network Isolation**: Isolate backend from public internet (use VPC)

3. **Firewall Rules**: Restrict database access to backend only

4. **Backup Encryption**: Encrypt database backups

5. **Access Control**: Limit access to production environments

### Operational Security

1. **API Key Rotation**: Rotate API keys periodically

2. **Monitoring**: Monitor for suspicious activity

3. **Incident Response**: Define incident response procedures

4. **Security Audits**: Regular security audits and penetration testing

## Security Assumptions

1. **Single API Key**: Shared API key for all requests (no per-user auth)

2. **Server-Side Security**: API keys never exposed to client

3. **Network Security**: HTTPS/TLS enforced in production

4. **Database Security**: PostgreSQL access restricted to backend

5. **No User Accounts**: No user authentication/authorization system

6. **No Rate Limiting**: No per-user or per-IP rate limiting (LLM providers handle this)

## Recommendations for Production

1. **Restrict CORS**: Configure allowed origins explicitly

2. **Rate Limiting**: Implement rate limiting for API endpoints

3. **WAF**: Use Web Application Firewall (Cloudflare, AWS WAF)

4. **DDoS Protection**: Implement DDoS protection

5. **Monitoring**: Implement security monitoring and alerting

6. **Audit Logging**: Log all API access for audit trails

7. **Multi-Factor Authentication**: Consider MFA for admin access (when added)

8. **Regular Updates**: Keep dependencies up to date

9. **Security Headers**: Review and configure Helmet settings

10. **Data Encryption**: Implement encryption at rest for sensitive fields

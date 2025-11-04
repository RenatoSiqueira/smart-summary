# Database Schema Documentation

## Overview

Smart Summary App uses PostgreSQL 15 as its primary database with TypeORM as the Object-Relational Mapping (ORM) tool. The database is designed to efficiently store and query summary requests with comprehensive analytics capabilities.

## Database Configuration

### Connection Details
- **Database Type**: PostgreSQL 15+
- **ORM**: TypeORM 0.3.17+
- **Connection**: Environment variable `DATABASE_URL`
- **Migrations**: Automated with TypeORM CLI
- **Synchronization**: Disabled (production-safe)

### TypeORM Configuration
```typescript
// apps/backend/src/database/typeorm.config.ts
export const typeormConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    'src/database/entities/**/*.entity{.ts,.js}',
    'src/**/*.entity{.ts,.js}',
  ],
  migrations: ['src/database/migrations/**/*{.ts,.js}'],
  synchronize: false, // Production-safe
  logging: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'schema'] 
    : ['error'],
  migrationsRun: false,
  migrationsTableName: 'migrations',
};
```

## Schema Structure

### Entity Relationship Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    summary_requests                         │
├─────────────────────────────────────────────────────────────┤
│ id                  UUID (PK)                               │
│ text                TEXT NOT NULL                           │
│ summary             TEXT NULL                               │
│ client_ip           VARCHAR NULL                            │
│ tokens_used         INTEGER DEFAULT 0                      │
│ cost                DECIMAL(10,6) DEFAULT 0                │
│ created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP    │
│ completed_at        TIMESTAMP NULL                          │
│ error               TEXT NULL                               │
├─────────────────────────────────────────────────────────────┤
│ Indexes:                                                    │
│ • PRIMARY KEY (id)                                          │
│ • IDX_summary_requests_client_ip (client_ip)               │
│ • IDX_summary_requests_created_at (created_at)             │
│ • IDX_summary_requests_created_at_client_ip (created_at, client_ip) │
│ • IDX_summary_requests_completed_at_error (completed_at, error) │
└─────────────────────────────────────────────────────────────┘
```

## Table Definitions

### summary_requests

The primary table storing all text summarization requests and their results.

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL, DEFAULT uuid_generate_v4() | Unique identifier for each request |
| `text` | TEXT | NOT NULL | Original text content to be summarized |
| `summary` | TEXT | NULL | Generated summary (NULL while processing) |
| `client_ip` | VARCHAR | NULL | Client IP address for tracking and analytics |
| `tokens_used` | INTEGER | NOT NULL, DEFAULT 0 | Number of tokens consumed by LLM |
| `cost` | DECIMAL(10,6) | NOT NULL, DEFAULT 0 | Processing cost in USD |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Request creation timestamp |
| `completed_at` | TIMESTAMP | NULL | Request completion timestamp |
| `error` | TEXT | NULL | Error message if processing failed |

#### Column Details

**id (UUID)**
- Primary key using UUID v4
- Generated automatically using PostgreSQL's `uuid_generate_v4()` function
- Provides globally unique identifiers suitable for distributed systems

**text (TEXT)**
- Stores the original text content submitted for summarization
- No length limit (PostgreSQL TEXT type can store up to 1GB)
- Required field, cannot be NULL

**summary (TEXT)**
- Stores the generated summary
- NULL while request is being processed
- Populated when summarization completes successfully

**client_ip (VARCHAR)**
- Stores client IP address for analytics and rate limiting
- Optional field (NULL allowed)
- Used for per-client metrics and potential abuse prevention

**tokens_used (INTEGER)**
- Number of tokens consumed by the LLM provider
- Includes both prompt and completion tokens
- Used for cost calculation and analytics

**cost (DECIMAL(10,6))**
- Processing cost in USD with 6 decimal precision
- Calculated based on token usage and provider pricing
- Precision allows for accurate micro-transactions

**created_at (TIMESTAMP)**
- Automatically set when record is created
- Used for time-based analytics and filtering
- Indexed for efficient date range queries

**completed_at (TIMESTAMP)**
- Set when summarization completes (success or failure)
- NULL for in-progress requests
- Used to identify completed vs. pending requests

**error (TEXT)**
- Stores error message if processing fails
- NULL for successful requests
- Used for debugging and error analytics

## Indexes

### Performance Indexes

#### IDX_summary_requests_client_ip
```sql
CREATE INDEX IDX_summary_requests_client_ip ON summary_requests (client_ip);
```
- **Purpose**: Optimize queries filtering by client IP
- **Use Cases**: Per-client analytics, rate limiting
- **Query Examples**: `WHERE client_ip = '192.168.1.1'`

#### IDX_summary_requests_created_at
```sql
CREATE INDEX IDX_summary_requests_created_at ON summary_requests (created_at);
```
- **Purpose**: Optimize time-based queries
- **Use Cases**: Date range filtering, daily analytics
- **Query Examples**: `WHERE created_at >= '2024-01-01'`

#### IDX_summary_requests_created_at_client_ip
```sql
CREATE INDEX IDX_summary_requests_created_at_client_ip ON summary_requests (created_at, client_ip);
```
- **Purpose**: Optimize combined time and client filtering
- **Use Cases**: Per-client analytics within date ranges
- **Query Examples**: `WHERE created_at BETWEEN '2024-01-01' AND '2024-01-31' AND client_ip = '192.168.1.1'`

#### IDX_summary_requests_completed_at_error
```sql
CREATE INDEX IDX_summary_requests_completed_at_error ON summary_requests (completed_at, error);
```
- **Purpose**: Optimize analytics queries filtering completed requests
- **Use Cases**: Success/failure analytics, excluding in-progress requests
- **Query Examples**: `WHERE completed_at IS NOT NULL AND error IS NULL`

## Migration History

### Migration 1730000000000-CreateSummaryRequests.ts
**Purpose**: Initial table creation with basic structure

**Changes**:
- Created `summary_requests` table
- Added all initial columns except `error`
- Created basic indexes for `client_ip` and `created_at`
- Enabled UUID extension (`uuid-ossp`)

**SQL Generated**:
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create table
CREATE TABLE "summary_requests" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "text" text NOT NULL,
    "summary" text,
    "client_ip" varchar,
    "tokens_used" integer DEFAULT 0 NOT NULL,
    "cost" decimal(10,6) DEFAULT 0 NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completed_at" timestamp
);

-- Create indexes
CREATE INDEX "IDX_summary_requests_client_ip" ON "summary_requests" ("client_ip");
CREATE INDEX "IDX_summary_requests_created_at" ON "summary_requests" ("created_at");
```

### Migration 1740000000000-AddErrorToSummaryRequests.ts
**Purpose**: Add error tracking capability

**Changes**:
- Added `error` column to store failure messages
- Allows NULL values for successful requests

**SQL Generated**:
```sql
ALTER TABLE "summary_requests" ADD COLUMN "error" text;
```

## TypeORM Entity Definition

```typescript
// apps/backend/src/summary/entities/summary-request.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('summary_requests')
@Index(['clientIp'])
@Index(['createdAt'])
@Index(['createdAt', 'clientIp'])
@Index(['completedAt', 'error'])
export class SummaryRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  text: string;

  @Column('text', { nullable: true })
  summary: string | null;

  @Column({ name: 'client_ip', type: 'varchar', nullable: true })
  clientIp: string | null;

  @Column({ name: 'tokens_used', type: 'integer', default: 0 })
  tokensUsed: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  cost: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;
}
```

## Common Queries

### Analytics Queries

#### Total Requests and Costs
```sql
SELECT 
    COUNT(*) as total_requests,
    SUM(tokens_used) as total_tokens_used,
    SUM(cost) as total_cost,
    AVG(tokens_used) as avg_tokens_per_request,
    AVG(cost) as avg_cost_per_request
FROM summary_requests 
WHERE completed_at IS NOT NULL 
    AND error IS NULL;
```

#### Daily Metrics
```sql
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as requests,
    SUM(tokens_used) as tokens_used,
    SUM(cost) as cost
FROM summary_requests 
WHERE completed_at IS NOT NULL
    AND created_at >= '2024-01-01'
    AND created_at <= '2024-01-31'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date ASC;
```

#### Client-Specific Analytics
```sql
SELECT 
    client_ip,
    COUNT(*) as requests,
    SUM(tokens_used) as tokens_used,
    SUM(cost) as cost
FROM summary_requests 
WHERE completed_at IS NOT NULL 
    AND error IS NULL
    AND client_ip IS NOT NULL
GROUP BY client_ip
ORDER BY requests DESC;
```

#### Error Analysis
```sql
SELECT 
    error,
    COUNT(*) as error_count,
    DATE_TRUNC('day', created_at) as error_date
FROM summary_requests 
WHERE error IS NOT NULL
GROUP BY error, DATE_TRUNC('day', created_at)
ORDER BY error_date DESC, error_count DESC;
```

### Operational Queries

#### In-Progress Requests
```sql
SELECT id, created_at, client_ip
FROM summary_requests 
WHERE completed_at IS NULL 
    AND error IS NULL
    AND created_at > NOW() - INTERVAL '1 hour';
```

#### Failed Requests
```sql
SELECT id, created_at, client_ip, error
FROM summary_requests 
WHERE error IS NOT NULL
    AND created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

#### Recent Activity
```sql
SELECT 
    id, 
    client_ip, 
    tokens_used, 
    cost, 
    created_at, 
    completed_at,
    CASE 
        WHEN error IS NOT NULL THEN 'failed'
        WHEN completed_at IS NOT NULL THEN 'completed'
        ELSE 'in_progress'
    END as status
FROM summary_requests 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;
```

## Database Maintenance

### Backup Strategy
```bash
# Daily backup
pg_dump -h localhost -U smartsummary -d smart_summary > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -h localhost -U smartsummary -d smart_summary | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Index Maintenance
```sql
-- Analyze table statistics
ANALYZE summary_requests;

-- Reindex if needed
REINDEX TABLE summary_requests;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'summary_requests';
```

### Data Cleanup
```sql
-- Clean up old completed requests (older than 1 year)
DELETE FROM summary_requests 
WHERE completed_at < NOW() - INTERVAL '1 year';

-- Clean up failed requests (older than 30 days)
DELETE FROM summary_requests 
WHERE error IS NOT NULL 
    AND created_at < NOW() - INTERVAL '30 days';
```

## Performance Considerations

### Query Optimization
- All time-based queries use indexed `created_at` column
- Client-specific queries use indexed `client_ip` column
- Analytics queries filter by `completed_at IS NOT NULL` for performance
- Composite indexes support complex filtering scenarios

### Storage Optimization
- TEXT columns for `text` and `summary` allow variable-length storage
- DECIMAL(10,6) provides precise cost tracking without floating-point errors
- UUID primary keys distribute data evenly across index pages

### Scaling Considerations
- Partitioning by date could be implemented for very large datasets
- Read replicas can handle analytics queries
- Connection pooling reduces connection overhead
- Regular VACUUM and ANALYZE maintain performance

## Security Considerations

### Data Protection
- No sensitive user data stored (only IP addresses)
- Text content is application data, not personal information
- Cost and usage data requires appropriate access controls

### Access Control
- Database user should have minimal required permissions
- Application-level authentication via API keys
- No direct database access for end users

### Audit Trail
- All requests are logged with timestamps
- Error tracking provides debugging information
- Client IP tracking enables abuse detection

This database schema provides a solid foundation for the Smart Summary App with efficient querying, comprehensive analytics, and room for future enhancements.

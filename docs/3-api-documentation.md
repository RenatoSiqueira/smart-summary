# API Documentation

## Overview

The Smart Summary App provides a RESTful API built with NestJS that offers text summarization and analytics capabilities. All endpoints require API key authentication and return JSON responses.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

All API endpoints require authentication using an API key passed in the request header.

### Headers
```http
X-API-Key: your_api_key_here
Content-Type: application/json
```

### Error Response
```json
{
  "statusCode": 401,
  "message": "Invalid API key",
  "error": "Unauthorized"
}
```

## Endpoints

### 1. Text Summarization

#### POST /api/summary

Generates a summary of the provided text using AI with real-time streaming via Server-Sent Events (SSE).

**Request:**
```http
POST /api/summary
X-API-Key: your_api_key_here
Content-Type: application/json

{
  "text": "Your long text content to be summarized..."
}
```

**Request Body Schema:**
```typescript
interface SummarizeRequestDto {
  text: string; // Required, 1-50000 characters
}
```

**Response:**
The endpoint returns a Server-Sent Events (SSE) stream with the following chunk types:

**Stream Chunk Types:**
```typescript
interface StreamChunk {
  type: 'start' | 'chunk' | 'complete' | 'error';
  content?: string;      // For 'chunk' type
  data?: SummarizeResult; // For 'complete' type
  error?: string;        // For 'error' type
}

interface SummarizeResult {
  summary: string;
  tokensUsed: number;
  cost: number;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}
```

**SSE Response Format:**
```
data: {"type":"start"}

data: {"type":"chunk","content":"This is the beginning of the summary..."}

data: {"type":"chunk","content":" and this continues the summary..."}

data: {"type":"complete","data":{"summary":"Complete summary text","tokensUsed":150,"cost":0.0023,"model":"gpt-4o-mini"}}
```

**Error Response:**
```
data: {"type":"error","error":"Rate limit exceeded"}
```

**Response Headers:**
```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**Status Codes:**
- `200 OK`: Streaming started successfully
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: Invalid or missing API key
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Example Usage (JavaScript):**
```javascript
const eventSource = new EventSource('/api/summary', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Your text to summarize...'
  })
});

eventSource.onmessage = function(event) {
  const chunk = JSON.parse(event.data);
  
  switch(chunk.type) {
    case 'start':
      console.log('Streaming started');
      break;
    case 'chunk':
      console.log('Content:', chunk.content);
      break;
    case 'complete':
      console.log('Summary:', chunk.data.summary);
      console.log('Tokens used:', chunk.data.tokensUsed);
      console.log('Cost:', chunk.data.cost);
      eventSource.close();
      break;
    case 'error':
      console.error('Error:', chunk.error);
      eventSource.close();
      break;
  }
};

eventSource.onerror = function(event) {
  console.error('SSE connection error:', event);
  eventSource.close();
};
```

### 2. Analytics

#### GET /api/analytics

Retrieves aggregated metrics for summary requests with optional filtering.

**Request:**
```http
GET /api/analytics?startDate=2024-01-01&endDate=2024-01-31&clientIp=192.168.1.1
X-API-Key: your_api_key_here
```

**Query Parameters:**
- `startDate` (optional): ISO date string for start date filtering (e.g., "2024-01-01")
- `endDate` (optional): ISO date string for end date filtering (e.g., "2024-01-31")
- `clientIp` (optional): Client IP address for filtering specific users

**Response:**
```json
{
  "totalRequests": 1250,
  "totalTokensUsed": 187500,
  "totalCost": 28.125,
  "averageTokensPerRequest": 150,
  "averageCostPerRequest": 0.0225,
  "requestsByDay": [
    {
      "date": "2024-01-01",
      "requests": 45,
      "tokensUsed": 6750,
      "cost": 1.0125
    },
    {
      "date": "2024-01-02",
      "requests": 52,
      "tokensUsed": 7800,
      "cost": 1.17
    }
  ]
}
```

**Response Schema:**
```typescript
interface AnalyticsResponseDto {
  totalRequests: number;
  totalTokensUsed: number;
  totalCost: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
  requestsByDay: DailyMetric[];
}

interface DailyMetric {
  date: string; // YYYY-MM-DD format
  requests: number;
  tokensUsed: number;
  cost: number;
}
```

**Status Codes:**
- `200 OK`: Analytics data retrieved successfully
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Invalid or missing API key
- `500 Internal Server Error`: Server error

**Error Responses:**
```json
{
  "statusCode": 400,
  "message": "Invalid date format for startDate. Expected ISO date string.",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "startDate must be before or equal to endDate",
  "error": "Bad Request"
}
```

### 3. Health Check

#### GET /api/health

Returns the health status of the application and its dependencies.

**Request:**
```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "llm": {
      "status": "up",
      "provider": "openrouter"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    },
    "llm": {
      "status": "up",
      "provider": "openrouter"
    }
  }
}
```

**Status Codes:**
- `200 OK`: All services healthy
- `503 Service Unavailable`: One or more services unhealthy

## Error Handling

### Standard Error Response Format
```json
{
  "statusCode": number,
  "message": string | string[],
  "error": string,
  "timestamp": string,
  "path": string
}
```

### Common Error Codes

#### 400 Bad Request
- Invalid request body format
- Missing required fields
- Field validation errors
- Invalid query parameters

#### 401 Unauthorized
- Missing API key
- Invalid API key
- API key validation failure

#### 429 Too Many Requests
- Rate limit exceeded
- LLM provider rate limits

#### 500 Internal Server Error
- Database connection errors
- LLM provider errors
- Unexpected server errors

#### 503 Service Unavailable
- Database unavailable
- LLM providers unavailable
- Health check failures

## Rate Limiting

### Current Implementation
- API key-based authentication (no rate limiting implemented)
- LLM provider rate limits are handled automatically
- Timeout protection: 5-minute maximum per request

### Recommended Rate Limits
- **Summary Endpoint**: 100 requests per hour per API key
- **Analytics Endpoint**: 1000 requests per hour per API key
- **Health Endpoint**: No rate limiting

## Request/Response Examples

### Successful Summary Request
```bash
curl -X POST http://localhost:3000/api/summary \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Artificial intelligence (AI) is intelligence demonstrated by machines, in contrast to the natural intelligence displayed by humans and animals. Leading AI textbooks define the field as the study of intelligent agents: any device that perceives its environment and takes actions that maximize its chance of successfully achieving its goals."
  }' \
  --no-buffer
```

### Analytics Request with Filtering
```bash
curl -X GET "http://localhost:3000/api/analytics?startDate=2024-01-01&endDate=2024-01-31" \
  -H "X-API-Key: your_api_key_here"
```

### Health Check Request
```bash
curl -X GET http://localhost:3000/api/health
```

## SDK Examples

### Node.js/TypeScript Example
```typescript
import { EventSource } from 'eventsource';

interface SummaryClient {
  apiKey: string;
  baseUrl: string;
}

class SmartSummaryClient implements SummaryClient {
  constructor(
    public apiKey: string,
    public baseUrl: string = 'http://localhost:3000/api'
  ) {}

  async summarize(text: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${this.baseUrl}/summary`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      let summary = '';

      eventSource.onmessage = (event) => {
        const chunk = JSON.parse(event.data);
        
        switch (chunk.type) {
          case 'chunk':
            summary += chunk.content;
            break;
          case 'complete':
            eventSource.close();
            resolve(chunk.data.summary);
            break;
          case 'error':
            eventSource.close();
            reject(new Error(chunk.error));
            break;
        }
      };

      eventSource.onerror = (error) => {
        eventSource.close();
        reject(error);
      };
    });
  }

  async getAnalytics(options?: {
    startDate?: string;
    endDate?: string;
    clientIp?: string;
  }): Promise<AnalyticsResponseDto> {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.clientIp) params.append('clientIp', options.clientIp);

    const response = await fetch(
      `${this.baseUrl}/analytics?${params.toString()}`,
      {
        headers: {
          'X-API-Key': this.apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }
}

// Usage
const client = new SmartSummaryClient('your_api_key_here');

// Summarize text
const summary = await client.summarize('Your long text here...');
console.log('Summary:', summary);

// Get analytics
const analytics = await client.getAnalytics({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
console.log('Total requests:', analytics.totalRequests);
```

### Python Example
```python
import requests
import json
import sseclient

class SmartSummaryClient:
    def __init__(self, api_key: str, base_url: str = "http://localhost:3000/api"):
        self.api_key = api_key
        self.base_url = base_url
    
    def summarize(self, text: str) -> str:
        headers = {
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json'
        }
        
        data = {'text': text}
        
        response = requests.post(
            f"{self.base_url}/summary",
            headers=headers,
            json=data,
            stream=True
        )
        
        if response.status_code != 200:
            raise Exception(f"API error: {response.status_code}")
        
        client = sseclient.SSEClient(response)
        summary = ""
        
        for event in client.events():
            chunk = json.loads(event.data)
            
            if chunk['type'] == 'chunk':
                summary += chunk.get('content', '')
            elif chunk['type'] == 'complete':
                return chunk['data']['summary']
            elif chunk['type'] == 'error':
                raise Exception(chunk['error'])
        
        return summary
    
    def get_analytics(self, start_date=None, end_date=None, client_ip=None):
        headers = {'X-API-Key': self.api_key}
        params = {}
        
        if start_date:
            params['startDate'] = start_date
        if end_date:
            params['endDate'] = end_date
        if client_ip:
            params['clientIp'] = client_ip
        
        response = requests.get(
            f"{self.base_url}/analytics",
            headers=headers,
            params=params
        )
        
        if response.status_code != 200:
            raise Exception(f"API error: {response.status_code}")
        
        return response.json()

# Usage
client = SmartSummaryClient('your_api_key_here')

# Summarize text
summary = client.summarize('Your long text here...')
print(f"Summary: {summary}")

# Get analytics
analytics = client.get_analytics(start_date='2024-01-01', end_date='2024-01-31')
print(f"Total requests: {analytics['totalRequests']}")
```

## WebSocket Alternative (Future Enhancement)

While the current implementation uses Server-Sent Events (SSE), a WebSocket implementation could be added for bidirectional communication:

```typescript
// Future WebSocket endpoint
interface WebSocketMessage {
  type: 'summarize' | 'cancel' | 'status';
  data?: any;
}

// WebSocket URL: ws://localhost:3000/ws/summary
// Authentication: API key in connection query parameter
```

## Versioning

The API currently uses implicit versioning. Future versions will include explicit versioning:

- **Current**: `/api/summary`, `/api/analytics`
- **Future**: `/api/v1/summary`, `/api/v2/summary`

## CORS Configuration

The API supports CORS with the following configuration:

- **Development**: All origins allowed
- **Production**: Configured via `ALLOWED_ORIGINS` environment variable
- **Credentials**: Supported
- **Methods**: GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Headers**: Content-Type, Authorization, X-API-Key

This API documentation provides comprehensive information for integrating with the Smart Summary App backend services.

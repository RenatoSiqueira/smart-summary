# Executive Summary

## Purpose

Smart Summary App is an AI-powered text summarization web application that enables users to generate concise summaries from long-form text content. The application leverages Large Language Models (LLMs) through a streaming interface, providing real-time feedback to users as summaries are generated. Additionally, the platform includes analytics capabilities for monitoring usage, token consumption, and costs.

## Business Objectives

- **Provide Fast Text Summarization**: Deliver quick and accurate text summarization with a user-friendly interface
- **Streaming User Experience**: Implement real-time streaming of summary generation for better user engagement
- **Usage Analytics**: Track and analyze summary requests, token usage, and associated costs
- **Cost Management**: Monitor and optimize LLM API costs through comprehensive analytics
- **Flexible LLM Integration**: Support multiple LLM providers (OpenRouter, OpenAI) with automatic fallback capabilities

## Key Features

- **Streaming Summarization**: Server-Sent Events (SSE) streaming for real-time summary generation
- **Analytics Dashboard**: Comprehensive metrics including total requests, tokens used, costs, and daily trends
- **API Security**: API key-based authentication for backend services
- **Provider Flexibility**: Support for OpenRouter (primary) and OpenAI (fallback) with automatic failover
- **Client Tracking**: Track requests by client IP for usage analysis

## Technical Stack Overview

- **Backend**: NestJS (Node.js framework) with TypeORM for database management
- **Frontend**: Next.js 14+ (App Router) with React and TypeScript
- **Database**: PostgreSQL for persistent storage
- **LLM Providers**: OpenRouter API and OpenAI API
- **Architecture**: Monorepo structure with shared types package

## System Capabilities

1. **Text Summarization Service**: Accepts text input and generates summaries using LLM APIs
2. **Streaming Response**: Provides incremental summary content as it's generated
3. **Request Tracking**: Logs all summary requests with metadata (tokens, cost, timestamps)
4. **Analytics Aggregation**: Computes metrics from stored request data
5. **Error Handling**: Comprehensive error tracking and reporting

## Assumptions

- Text input can be of arbitrary length (handled appropriately)
- Users primarily consume summaries through web interface
- API access is controlled via API keys for security
- Both development and production environments are supported
- LLM providers are reliable but may have rate limits or temporary outages (handled with fallback)

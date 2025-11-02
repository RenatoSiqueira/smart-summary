import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from '../logging.interceptor';
import { Request, Response } from 'express';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logger: Logger;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const createMockExecutionContext = (
    method: string = 'GET',
    url: string = '/api/test',
    ip: string = '127.0.0.1',
    userAgent: string = 'test-agent',
    forwardedFor?: string,
  ): ExecutionContext => {
    const request = {
      method,
      originalUrl: url,
      ip,
      headers: {
        'user-agent': userAgent,
        ...(forwardedFor && { 'x-forwarded-for': forwardedFor }),
      },
      get: jest.fn((header: string) => {
        if (header === 'user-agent') return userAgent;
        return undefined;
      }),
    } as unknown as Request;

    const response = {
      statusCode: 200,
    } as Response;

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ExecutionContext;
  };

  const createMockCallHandler = (
    value: any,
    shouldError: boolean = false,
  ): CallHandler => {
    const handler = {
      handle: jest.fn(() =>
        shouldError ? throwError(() => value) : of(value),
      ),
    } as CallHandler;
    return handler;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
    logger = (interceptor as any).logger;
    loggerLogSpy = jest.spyOn(logger, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('default options', () => {
    it('should log request and response by default', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ success: true });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(loggerLogSpy).toHaveBeenCalledTimes(2);
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('Incoming Request: GET /api/test'),
          );
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('Response: GET /api/test'),
          );
          done();
        },
      });
    });

    it('should log errors by default', (done) => {
      const context = createMockExecutionContext();
      const error = new Error('Test error');
      (error as any).status = 500;
      const handler = createMockCallHandler(error, true);

      interceptor.intercept(context, handler).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Error: GET /api/test'),
            expect.any(String),
          );
          done();
        },
      });
    });
  });

  describe('request logging', () => {
    it('should log request with method, URL, IP, and user-agent', (done) => {
      const context = createMockExecutionContext(
        'POST',
        '/api/summary',
        '192.168.1.1',
        'Mozilla/5.0',
      );
      const handler = createMockCallHandler({});

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('Incoming Request: POST /api/summary'),
          );
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('IP: 192.168.1.1'),
          );
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('User-Agent: Mozilla/5.0'),
          );
          done();
        },
      });
    });

    it('should use x-forwarded-for header if available', (done) => {
      const context = createMockExecutionContext(
        'GET',
        '/api/test',
        '127.0.0.1',
        'test-agent',
        '192.168.1.100, 10.0.0.1',
      );
      const handler = createMockCallHandler({});

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('IP: 192.168.1.100'),
          );
          done();
        },
      });
    });

    it('should use x-real-ip header if x-forwarded-for is not available', (done) => {
      const request = {
        method: 'GET',
        originalUrl: '/api/test',
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'test-agent',
          'x-real-ip': '192.168.1.200',
        },
        get: jest.fn((header: string) => {
          if (header === 'user-agent') return 'test-agent';
          return undefined;
        }),
      } as unknown as Request;

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({ statusCode: 200 }) as Response,
        }),
      } as ExecutionContext;

      const handler = createMockCallHandler({});

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('IP: 192.168.1.200'),
          );
          done();
        },
      });
    });

    it('should use "unknown" if no IP is available', (done) => {
      const request = {
        method: 'GET',
        originalUrl: '/api/test',
        ip: undefined,
        headers: {},
        get: jest.fn(() => undefined),
      } as unknown as Request;

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({ statusCode: 200 }) as Response,
        }),
      } as ExecutionContext;

      const handler = createMockCallHandler({});

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('IP: unknown'),
          );
          done();
        },
      });
    });

    it('should not log request if logRequest is false', (done) => {
      const customInterceptor = new LoggingInterceptor({ logRequest: false });
      const customLoggerLogSpy = jest
        .spyOn((customInterceptor as any).logger, 'log')
        .mockImplementation();
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({});

      customInterceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(customLoggerLogSpy).toHaveBeenCalledTimes(1);
          expect(customLoggerLogSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('Incoming Request'),
          );
          done();
        },
      });
    });
  });

  describe('response logging', () => {
    it('should log response with method, URL, status code, and duration', (done) => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ success: true });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('Response: GET /api/test'),
          );
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('Status: 200'),
          );
          expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringMatching(/Duration: \d+ms/),
          );
          done();
        },
      });
    });

    it('should not log response if logResponse is false', (done) => {
      const customInterceptor = new LoggingInterceptor({ logResponse: false });
      const customLoggerLogSpy = jest
        .spyOn((customInterceptor as any).logger, 'log')
        .mockImplementation();
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({});

      customInterceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(customLoggerLogSpy).toHaveBeenCalledTimes(1);
          expect(customLoggerLogSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('Response:'),
          );
          done();
        },
      });
    });

    it('should log response body if logResponseBody is true', (done) => {
      const customInterceptor = new LoggingInterceptor({
        logResponseBody: true,
      });
      const customLoggerLogSpy = jest
        .spyOn((customInterceptor as any).logger, 'log')
        .mockImplementation();
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'test data' });

      customInterceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(customLoggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('Body: {"result":"test data"}'),
          );
          done();
        },
      });
    });

    it('should truncate long response bodies', (done) => {
      const customInterceptor = new LoggingInterceptor({
        logResponseBody: true,
      });
      const customLoggerLogSpy = jest
        .spyOn((customInterceptor as any).logger, 'log')
        .mockImplementation();
      const context = createMockExecutionContext();
      const longData = 'a'.repeat(200);
      const handler = createMockCallHandler({ data: longData });

      customInterceptor.intercept(context, handler).subscribe({
        next: () => {
          const logCall = customLoggerLogSpy.mock.calls.find((call) =>
            (call[0] as string).includes('Body:'),
          );
          expect(logCall).toBeDefined();
          expect(logCall?.[0] as string).toContain('...');
          expect(
            (logCall?.[0] as string)?.split('Body: ')?.[1]?.length,
          ).toBeLessThanOrEqual(113); // "Body: " + 100 chars + "..."
          done();
        },
      });
    });
  });

  describe('error logging', () => {
    it('should log error with status code and duration', (done) => {
      const context = createMockExecutionContext();
      const error = new Error('Test error');
      (error as any).status = 400;
      const handler = createMockCallHandler(error, true);

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Error: GET /api/test'),
            expect.any(String),
          );
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Status: 400'),
            expect.any(String),
          );
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.stringMatching(/Duration: \d+ms/),
            expect.any(String),
          );
          done();
        },
      });
    });

    it('should use statusCode property if status is not available', (done) => {
      const context = createMockExecutionContext();
      const error = new Error('Test error');
      (error as any).statusCode = 404;
      const handler = createMockCallHandler(error, true);

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Status: 404'),
            expect.any(String),
          );
          done();
        },
      });
    });

    it('should default to 500 if no status is available', (done) => {
      const context = createMockExecutionContext();
      const error = new Error('Test error');
      const handler = createMockCallHandler(error, true);

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Status: 500'),
            expect.any(String),
          );
          done();
        },
      });
    });

    it('should log error stack trace if available', (done) => {
      const context = createMockExecutionContext();
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      (error as any).status = 500;
      const handler = createMockCallHandler(error, true);

      interceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Error: GET /api/test'),
            'Error stack trace',
          );
          done();
        },
      });
    });

    it('should not log errors if logErrors is false', (done) => {
      const customInterceptor = new LoggingInterceptor({ logErrors: false });
      const context = createMockExecutionContext();
      const error = new Error('Test error');
      const handler = createMockCallHandler(error, true);

      customInterceptor.intercept(context, handler).subscribe({
        error: () => {
          expect(loggerErrorSpy).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should re-throw the error after logging', (done) => {
      const context = createMockExecutionContext();
      const error = new Error('Test error');
      (error as any).status = 500;
      const handler = createMockCallHandler(error, true);

      interceptor.intercept(context, handler).subscribe({
        error: (thrownError) => {
          expect(thrownError).toBe(error);
          expect(loggerErrorSpy).toHaveBeenCalled();
          done();
        },
      });
    });
  });
});

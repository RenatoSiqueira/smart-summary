import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Optional,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

export interface LoggingInterceptorOptions {
  logRequest?: boolean;
  logResponse?: boolean;
  logErrors?: boolean;
  logResponseBody?: boolean;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  private readonly options: Required<LoggingInterceptorOptions>;

  constructor(@Optional() options?: LoggingInterceptorOptions) {
    this.options = {
      logRequest: true,
      logResponse: true,
      logErrors: true,
      logResponseBody: false,
      ...options,
    };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    const clientIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      ip ||
      'unknown';

    if (this.options.logRequest) {
      this.logger.log(
        `Incoming Request: ${method} ${originalUrl} - IP: ${clientIp} - User-Agent: ${userAgent}`,
      );
    }

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        if (this.options.logResponse) {
          let logMessage = `Response: ${method} ${originalUrl} - Status: ${statusCode} - Duration: ${duration}ms`;

          if (this.options.logResponseBody && data) {
            const bodyPreview =
              typeof data === 'string'
                ? data.substring(0, 100)
                : JSON.stringify(data).substring(0, 100);
            logMessage += ` - Body: ${bodyPreview}...`;
          }

          this.logger.log(logMessage);
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error?.status || error?.statusCode || 500;
        const errorMessage = error?.message || 'Unknown error';

        if (this.options.logErrors) {
          this.logger.error(
            `Error: ${method} ${originalUrl} - Status: ${statusCode} - Duration: ${duration}ms - Error: ${errorMessage}`,
            error?.stack || '',
          );
        }

        return throwError(() => error);
      }),
    );
  }
}

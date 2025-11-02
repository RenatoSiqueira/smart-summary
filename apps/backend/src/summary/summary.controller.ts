import {
  Controller,
  Post,
  Body,
  UseGuards,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, Subscription } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SummaryService } from './summary.service';
import { SummarizeRequestDto } from './dto/summarize-request.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { ClientIp } from '../common/decorators/client-ip.decorator';
import { StreamChunk } from '../llm/interfaces';

@Controller('summary')
@UseGuards(ApiKeyGuard)
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  /**
   * POST /api/summary
   * Stream summarize text using Server-Sent Events (SSE)
   *
   * @param body Request body containing text to summarize
   * @param clientIp Client IP address (extracted from request headers)
   * @param res Express Response object for SSE streaming
   * @returns SSE stream of summary chunks
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async streamSummarize(
    @Body() body: SummarizeRequestDto,
    @ClientIp() clientIp: string,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const stream$: Observable<StreamChunk> =
      this.summaryService.streamSummarize(
        body.text,
        clientIp !== 'unknown' ? clientIp : undefined,
      );

    let subscription: Subscription | null = null;

    res.on('close', () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });

    subscription = stream$
      .pipe(
        map((chunk: StreamChunk) => {
          return this.formatSSE(chunk);
        }),
        catchError((error) => {
          const errorChunk: StreamChunk = {
            type: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'An unexpected error occurred',
          };
          return [this.formatSSE(errorChunk)];
        }),
      )
      .subscribe({
        next: (sseData: string) => {
          if (!res.closed) {
            res.write(sseData);
          }
        },
        error: (error: Error) => {
          const errorChunk: StreamChunk = {
            type: 'error',
            error: error.message || 'An unexpected error occurred',
          };
          if (!res.closed) {
            res.write(this.formatSSE(errorChunk));
            res.end();
          }
        },
        complete: () => {
          if (!res.closed) {
            res.end();
          }
        },
      });
  }

  /**
   * Format StreamChunk as Server-Sent Event (SSE) format
   * SSE format: "data: <json>\n\n"
   *
   * @param chunk StreamChunk to format
   * @returns SSE-formatted string
   */
  private formatSSE(chunk: StreamChunk): string {
    const data = JSON.stringify(chunk);
    return `data: ${data}\n\n`;
  }
}

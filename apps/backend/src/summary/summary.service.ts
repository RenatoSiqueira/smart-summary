import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { Observable } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';
import { LLMService } from '../llm/llm.service';
import { SummaryRequest } from './entities/summary-request.entity';
import { StreamChunk, SummarizeOptions } from '../llm/interfaces';

@Injectable()
export class SummaryService {
  constructor(
    @InjectRepository(SummaryRequest)
    private readonly summaryRequestRepository: Repository<SummaryRequest>,
    private readonly llmService: LLMService,
  ) {}

  async createSummaryRequest(
    text: string,
    clientIp?: string,
  ): Promise<SummaryRequest> {
    const summaryRequest = this.summaryRequestRepository.create({
      text,
      clientIp,
      tokensUsed: 0,
      cost: 0,
      summary: null,
      completedAt: null,
      error: null,
    });

    return await this.summaryRequestRepository.save(summaryRequest);
  }

  async updateSummaryRequest(
    id: string,
    summary: string,
    tokensUsed: number,
    cost: number,
    completedAt: Date,
  ): Promise<UpdateResult> {
    return await this.summaryRequestRepository.update(id, {
      summary,
      tokensUsed,
      cost,
      completedAt,
    });
  }

  streamSummarize(
    text: string,
    clientIp?: string,
    options?: SummarizeOptions,
  ): Observable<StreamChunk> {
    let summaryRequest: SummaryRequest | null = null;

    return new Observable<StreamChunk>((subscriber) => {
      this.createSummaryRequest(text, clientIp)
        .then((request) => {
          summaryRequest = request;

          this.llmService
            .streamSummarize(text, options)
            .pipe(
              map((chunk: StreamChunk) => {
                return chunk;
              }),
              catchError((error) => {
                if (summaryRequest) {
                  this.handleError(summaryRequest.id, error).catch(() => {});
                }
                return new Observable<StreamChunk>((errorSubscriber) => {
                  errorSubscriber.next({
                    type: 'error',
                    error:
                      error instanceof Error
                        ? error.message
                        : 'Unknown error occurred',
                  });
                  errorSubscriber.error(error);
                });
              }),
              finalize(async () => {}),
            )
            .subscribe({
              next: (chunk: StreamChunk) => {
                subscriber.next(chunk);

                if (chunk.type === 'complete' && chunk.data && summaryRequest) {
                  const { summary, tokensUsed, cost } = chunk.data;
                  this.updateSummaryRequest(
                    summaryRequest.id,
                    summary,
                    tokensUsed,
                    cost,
                    new Date(),
                  ).catch((error) => {
                    console.error('Failed to update summary request:', error);
                  });
                }
              },
              error: (error) => {
                subscriber.error(error);
              },
              complete: () => {
                subscriber.complete();
              },
            });
        })
        .catch((error) => {
          subscriber.next({
            type: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'Failed to create request',
          });
          subscriber.error(
            new Error(
              `Failed to create summary request: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ),
          );
        });
    });
  }

  private async handleError(requestId: string, error: any): Promise<void> {
    try {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);

      const errorType =
        error instanceof Error
          ? error.name || error.constructor?.name || 'Error'
          : 'UnknownError';

      console.error(`[SummaryService] Summary request ${requestId} failed:`, {
        requestId,
        errorType,
        errorMessage,
        error: error instanceof Error ? error.stack : error,
      });

      await this.summaryRequestRepository.update(requestId, {
        error: errorMessage,
        completedAt: new Date(),
      });
    } catch (updateError) {
      console.error(
        `[SummaryService] Failed to update error info for request ${requestId}:`,
        updateError,
      );
    }
  }

  async getSummaryRequest(id: string): Promise<SummaryRequest | null> {
    return await this.summaryRequestRepository.findOne({ where: { id } });
  }
}

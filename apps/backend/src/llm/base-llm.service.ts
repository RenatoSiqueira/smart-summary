import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import {
  ILLMService,
  SummarizeOptions,
  StreamChunk,
  LLMServiceError,
  LLMRateLimitError,
  SummarizeResult,
} from './interfaces';

const DEFAULT_MAX_TOKENS = 500;

export abstract class BaseLLMService implements ILLMService {
  protected readonly apiKey: string;
  protected readonly apiUrl: string;

  constructor(
    protected readonly configService: ConfigService,
    apiKey: string,
    apiUrl: string,
  ) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  streamSummarize(
    text: string,
    options?: SummarizeOptions,
  ): Observable<StreamChunk> {
    return new Observable((subscriber) => {
      const model = options?.model || this.getDefaultModel();
      const maxTokens = options?.maxTokens || DEFAULT_MAX_TOKENS;
      const temperature = options?.temperature ?? 0.7;

      subscriber.next({
        type: 'start',
      });

      const messages = this.buildMessages(text);
      fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: this.buildRequestHeaders(),
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: true,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            await this.handleErrorResponse(response);
          }

          if (!response.body) {
            throw new LLMServiceError('Response body is null');
          }

          this.processStream(response.body, model, subscriber, text, messages);
        })
        .catch((error) => {
          this.handleStreamError(error, subscriber);
        });
    });
  }

  private async processStream(
    body: ReadableStream<Uint8Array>,
    model: string,
    subscriber: any,
    originalText: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullSummary = '';
    let usageData: any = null;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              const result = this.mapResponseToResult(
                {
                  choices: [
                    {
                      message: {
                        content: fullSummary,
                      },
                    },
                  ],
                  usage: usageData || {},
                  model,
                },
                model,
                originalText,
                messages,
              );
              subscriber.next({
                type: 'complete',
                data: result,
              });
              subscriber.complete();
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                fullSummary += content;
                subscriber.next({
                  type: 'chunk',
                  content,
                });
              }

              if (parsed.usage) {
                usageData = parsed.usage;
              }
            } catch (e) {}
          }
        }
      }

      const result = this.mapResponseToResult(
        {
          choices: [
            {
              message: {
                content: fullSummary,
              },
            },
          ],
          usage: usageData || {},
          model,
        },
        model,
        originalText,
        messages,
      );
      subscriber.next({
        type: 'complete',
        data: result,
      });

      subscriber.complete();
    } catch (error) {
      subscriber.error(error);
    }
  }

  private handleStreamError(error: any, subscriber: any): void {
    if (error instanceof LLMServiceError) {
      subscriber.next({
        type: 'error',
        error: error.message,
      });
      subscriber.error(error);
    } else {
      const serviceError = new LLMServiceError(
        `Failed to stream summarize: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error,
      );
      subscriber.next({
        type: 'error',
        error: serviceError.message,
      });
      subscriber.error(serviceError);
    }
  }

  /**
   * Estimate token count based on text length
   * Uses a simple approximation: ~4 characters per token (rough estimate used by many tokenizers)
   * This is a fallback when usage data is not available from the API
   */
  protected estimateTokens(text: string): number {
    if (!text) return 0;
    // Rough approximation: ~4 characters per token
    // This is a simple heuristic - actual tokenization varies by model
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate prompt tokens from messages array
   * Accounts for system message, user message, and formatting overhead
   */
  protected estimatePromptTokens(
    messages: Array<{ role: string; content: string }>,
  ): number {
    if (!messages || messages.length === 0) return 0;

    // Estimate tokens for all messages plus formatting overhead
    // Each message adds ~4 tokens for role/formatting, plus content tokens
    let totalTokens = 0;
    for (const message of messages) {
      totalTokens += this.estimateTokens(message.content);
      totalTokens += 4; // Overhead for role, formatting, etc.
    }
    totalTokens += 2; // Additional overhead for the overall structure

    return totalTokens;
  }

  /**
   * Map API response to SummarizeResult
   * If usage data is not available, estimates tokens based on text length
   */
  protected mapResponseToResult(
    data: any,
    model: string,
    originalText?: string,
    messages?: Array<{ role: string; content: string }>,
  ): SummarizeResult {
    const choice = data.choices?.[0];
    const usage = data.usage || {};
    const summary = choice?.message?.content || '';

    let promptTokens = usage.prompt_tokens || 0;
    let completionTokens = usage.completion_tokens || 0;
    let totalTokens = usage.total_tokens || 0;

    if (
      totalTokens === 0 &&
      promptTokens === 0 &&
      completionTokens === 0 &&
      (messages || originalText || summary)
    ) {
      if (messages && messages.length > 0) {
        promptTokens = this.estimatePromptTokens(messages);
      } else if (originalText) {
        promptTokens = this.estimatePromptTokens(
          this.buildMessages(originalText),
        );
      }

      if (summary) {
        completionTokens = this.estimateTokens(summary);
      }

      totalTokens = promptTokens + completionTokens;
    } else if (totalTokens === 0) {
      totalTokens = promptTokens + completionTokens;
    }

    const cost = this.calculateCost(model, promptTokens, completionTokens);

    return {
      summary,
      tokensUsed: totalTokens,
      cost,
      model,
      promptTokens,
      completionTokens,
    };
  }

  protected async handleErrorResponse(response: Response): Promise<never> {
    const statusCode = response.status;
    let errorData: any;

    try {
      errorData = await response.json();
    } catch {
      errorData = { message: await response.text() };
    }

    if (statusCode === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new LLMRateLimitError(
        errorData.error?.message || 'Rate limit exceeded',
        retryAfter ? parseInt(retryAfter, 10) : undefined,
        errorData,
      );
    }

    throw new LLMServiceError(
      errorData.error?.message || this.getApiErrorMessage(statusCode),
      statusCode,
      errorData,
    );
  }

  protected abstract getDefaultModel(): string;

  protected buildRequestHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  protected buildMessages(
    text: string,
  ): Array<{ role: string; content: string }> {
    return [
      {
        role: 'system',
        content: `You are an expert summarization assistant.
      Your job is to read the text provided by the user and produce a clear, accurate, and well-structured summary.
      Automatically detect the type of content (e.g., article, meeting notes, email, documentation, academic text, news, story) and adapt the summary style accordingly.
      
      General rules:
      - Preserve all key points and important context.
      - Do not add information that is not present in the text (no hallucinations).
      - Keep the language neutral, objective, and easy to read.
      - Summaries should be concise but informative.
      
      When summarizing:
      • For emails → capture purpose, key info, required actions, decisions.
      • For meeting notes → list decisions, action items, owners, deadlines if present.
      • For articles, essays, news or reports → capture main topic, key arguments, conclusions.
      • For stories or narratives → describe main plot, characters, conflict, and outcome.
      • For technical or instructional content → summarize main concepts, steps, recommendations.
      
      Summary Length:
      - Default: 3–7 bullet points OR a short paragraph of 60–120 words.
      - If the text is long or complex, expand up to 150–200 words only when necessary.
      
      Formatting:
      - Use bullet points when possible unless a short paragraph is more natural.
      - If there are action items or decisions, include a section titled “Action Items” or “Key Decisions”.
      `,
      },
      {
        role: 'user',
        content: `Summarize the following text:\n\n${text}\n\nOutput only the summary. Do not include explanations of how you analyzed the text.`,
      },
    ];
  }

  protected abstract calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): number;

  protected abstract getApiErrorMessage(statusCode: number): string;
}

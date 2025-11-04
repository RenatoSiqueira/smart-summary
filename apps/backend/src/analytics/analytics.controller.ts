import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

/**
 * Parse date from query parameter
 * Converts ISO date string to Date object
 */
@Injectable()
class ParseDatePipe
  implements PipeTransform<string | undefined, Date | undefined>
{
  transform(
    value: string | undefined,
    metadata: ArgumentMetadata,
  ): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(
        `Invalid date format for ${metadata.data}. Expected ISO date string.`,
      );
    }
    return date;
  }
}

@Controller('analytics')
@UseGuards(ApiKeyGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /api/analytics
   * Get aggregated metrics for summary requests
   *
   * Query parameters:
   * - startDate: Optional ISO date string for start date filtering
   * - endDate: Optional ISO date string for end date filtering
   * - clientIp: Optional client IP address for filtering
   *
   * @param startDate Optional start date for filtering
   * @param endDate Optional end date for filtering
   * @param clientIp Optional client IP for filtering
   * @returns AnalyticsResponseDto with aggregated metrics
   */
  @Get()
  async getMetrics(
    @Query('startDate', new ParseDatePipe()) startDate?: Date,
    @Query('endDate', new ParseDatePipe()) endDate?: Date,
    @Query('clientIp') clientIp?: string,
  ): Promise<AnalyticsResponseDto> {
    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    return await this.analyticsService.getMetrics(startDate, endDate, clientIp);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SummaryRequest } from '../database/entities/summary-request.entity';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';
import { DailyMetric } from '@smart-summary/types';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(SummaryRequest)
    private readonly summaryRequestRepository: Repository<SummaryRequest>,
  ) {}

  /**
   * Get aggregated metrics for summary requests
   *
   * @param startDate Optional start date for filtering
   * @param endDate Optional end date for filtering
   * @param clientIp Optional client IP for filtering
   * @returns AnalyticsResponseDto with aggregated metrics
   */
  async getMetrics(
    startDate?: Date,
    endDate?: Date,
    clientIp?: string,
  ): Promise<AnalyticsResponseDto> {
    const queryBuilder =
      this.summaryRequestRepository.createQueryBuilder('request');

    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.where(
          'request.createdAt BETWEEN :startDate AND :endDate',
          {
            startDate,
            endDate,
          },
        );
      } else if (startDate) {
        queryBuilder.where('request.createdAt >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.where('request.createdAt <= :endDate', { endDate });
      }
    }

    if (clientIp) {
      if (startDate || endDate) {
        queryBuilder.andWhere('request.clientIp = :clientIp', { clientIp });
      } else {
        queryBuilder.where('request.clientIp = :clientIp', { clientIp });
      }
    }

    queryBuilder.andWhere('request.completedAt IS NOT NULL');
    queryBuilder.andWhere('request.error IS NULL');

    const result = await queryBuilder
      .select('COUNT(request.id)', 'totalRequests')
      .addSelect('SUM(request.tokensUsed)', 'totalTokensUsed')
      .addSelect('SUM(request.cost)', 'totalCost')
      .getRawOne();

    const totalRequests = parseInt(result.totalRequests || '0', 10);
    const totalTokensUsed = parseFloat(result.totalTokensUsed || '0');
    const totalCost = parseFloat(result.totalCost || '0');

    const averageTokensPerRequest =
      totalRequests > 0 ? totalTokensUsed / totalRequests : 0;
    const averageCostPerRequest =
      totalRequests > 0 ? totalCost / totalRequests : 0;

    const requestsByDay = await this.getDailyMetrics(
      startDate,
      endDate,
      clientIp,
    );

    return new AnalyticsResponseDto({
      totalRequests,
      totalTokensUsed: Math.round(totalTokensUsed),
      totalCost: parseFloat(totalCost.toFixed(6)),
      averageTokensPerRequest: Math.round(averageTokensPerRequest),
      averageCostPerRequest: parseFloat(averageCostPerRequest.toFixed(6)),
      requestsByDay,
    });
  }

  /**
   * Get metrics grouped by day
   *
   * @param startDate Optional start date for filtering
   * @param endDate Optional end date for filtering
   * @param clientIp Optional client IP for filtering
   * @returns Array of daily metrics
   */
  private async getDailyMetrics(
    startDate?: Date,
    endDate?: Date,
    clientIp?: string,
  ): Promise<DailyMetric[]> {
    const queryBuilder =
      this.summaryRequestRepository.createQueryBuilder('request');

    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.where(
          'request.createdAt BETWEEN :startDate AND :endDate',
          {
            startDate,
            endDate,
          },
        );
      } else if (startDate) {
        queryBuilder.where('request.createdAt >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.where('request.createdAt <= :endDate', { endDate });
      }
    }

    if (clientIp) {
      if (startDate || endDate) {
        queryBuilder.andWhere('request.clientIp = :clientIp', { clientIp });
      } else {
        queryBuilder.where('request.clientIp = :clientIp', { clientIp });
      }
    }

    queryBuilder.andWhere('request.completedAt IS NOT NULL');

    const results = await queryBuilder
      .select("DATE_TRUNC('day', request.createdAt)", 'date')
      .addSelect('COUNT(request.id)', 'requests')
      .addSelect('SUM(request.tokensUsed)', 'tokensUsed')
      .addSelect('SUM(request.cost)', 'cost')
      .groupBy("DATE_TRUNC('day', request.createdAt)")
      .orderBy("DATE_TRUNC('day', request.createdAt)", 'ASC')
      .getRawMany();

    return results.map((row) => {
      let dateString: string;
      if (row.date instanceof Date) {
        dateString = row.date.toISOString().split('T')[0] ?? '';
      } else if (typeof row.date === 'string') {
        dateString = row.date.split('T')[0] ?? '';
      } else if (row.date) {
        dateString = new Date(row.date).toISOString().split('T')[0] ?? '';
      } else {
        dateString = new Date().toISOString().split('T')[0] ?? '';
      }

      if (!dateString) {
        dateString = new Date().toISOString().split('T')[0] ?? '';
      }

      return {
        date: dateString,
        requests: parseInt(row.requests || '0', 10),
        tokensUsed: Math.round(parseFloat(row.tokensUsed || '0')),
        cost: parseFloat(parseFloat(row.cost || '0').toFixed(6)),
      };
    });
  }
}

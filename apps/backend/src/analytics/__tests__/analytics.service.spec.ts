import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { AnalyticsService } from '../analytics.service';
import { SummaryRequest } from '../../database/entities/summary-request.entity';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<SummaryRequest>>;

  const createMockQueryBuilder = () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
    } as unknown as SelectQueryBuilder<SummaryRequest>;
    return qb;
  };

  beforeEach(async () => {
    queryBuilder = createMockQueryBuilder() as jest.Mocked<
      SelectQueryBuilder<SummaryRequest>
    >;

    const mockRepository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(SummaryRequest),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should calculate basic metrics correctly', async () => {
      const mockResult = {
        totalRequests: '10',
        totalTokensUsed: '5000',
        totalCost: '0.075',
      };
      const mockDailyResults = [
        {
          date: new Date('2024-01-01'),
          requests: '5',
          tokensUsed: '2500',
          cost: '0.0375',
        },
        {
          date: new Date('2024-01-02'),
          requests: '5',
          tokensUsed: '2500',
          cost: '0.0375',
        },
      ];

      queryBuilder.getRawOne.mockResolvedValue(mockResult);
      queryBuilder.getRawMany.mockResolvedValue(mockDailyResults);

      const metrics = await service.getMetrics();

      expect(metrics.totalRequests).toBe(10);
      expect(metrics.totalTokensUsed).toBe(5000);
      expect(metrics.totalCost).toBe(0.075);
      expect(metrics.averageTokensPerRequest).toBe(500);
      expect(metrics.averageCostPerRequest).toBe(0.0075);
      expect(metrics.requestsByDay).toHaveLength(2);
    });

    it('should handle empty data correctly', async () => {
      const mockResult = {
        totalRequests: '0',
        totalTokensUsed: '0',
        totalCost: '0',
      };

      queryBuilder.getRawOne.mockResolvedValue(mockResult);
      queryBuilder.getRawMany.mockResolvedValue([]);

      const metrics = await service.getMetrics();

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.totalTokensUsed).toBe(0);
      expect(metrics.totalCost).toBe(0);
      expect(metrics.averageTokensPerRequest).toBe(0);
      expect(metrics.averageCostPerRequest).toBe(0);
      expect(metrics.requestsByDay).toHaveLength(0);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      queryBuilder.getRawOne.mockResolvedValue({
        totalRequests: '5',
        totalTokensUsed: '2500',
        totalCost: '0.0375',
      });
      queryBuilder.getRawMany.mockResolvedValue([]);

      await service.getMetrics(startDate, endDate);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'request.createdAt BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    });

    it('should filter by start date only', async () => {
      const startDate = new Date('2024-01-01');

      queryBuilder.getRawOne.mockResolvedValue({
        totalRequests: '5',
        totalTokensUsed: '2500',
        totalCost: '0.0375',
      });
      queryBuilder.getRawMany.mockResolvedValue([]);

      await service.getMetrics(startDate);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'request.createdAt >= :startDate',
        { startDate },
      );
    });

    it('should filter by end date only', async () => {
      const endDate = new Date('2024-01-31');

      queryBuilder.getRawOne.mockResolvedValue({
        totalRequests: '5',
        totalTokensUsed: '2500',
        totalCost: '0.0375',
      });
      queryBuilder.getRawMany.mockResolvedValue([]);

      await service.getMetrics(undefined, endDate);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'request.createdAt <= :endDate',
        { endDate },
      );
    });

    it('should filter by client IP', async () => {
      const clientIp = '127.0.0.1';

      queryBuilder.getRawOne.mockResolvedValue({
        totalRequests: '3',
        totalTokensUsed: '1500',
        totalCost: '0.0225',
      });
      queryBuilder.getRawMany.mockResolvedValue([]);

      await service.getMetrics(undefined, undefined, clientIp);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'request.clientIp = :clientIp',
        { clientIp },
      );
    });

    it('should filter by date range and client IP', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const clientIp = '127.0.0.1';

      queryBuilder.getRawOne.mockResolvedValue({
        totalRequests: '3',
        totalTokensUsed: '1500',
        totalCost: '0.0225',
      });
      queryBuilder.getRawMany.mockResolvedValue([]);

      await service.getMetrics(startDate, endDate, clientIp);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'request.createdAt BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'request.clientIp = :clientIp',
        { clientIp },
      );
    });

    it('should only count completed requests', async () => {
      queryBuilder.getRawOne.mockResolvedValue({
        totalRequests: '5',
        totalTokensUsed: '2500',
        totalCost: '0.0375',
      });
      queryBuilder.getRawMany.mockResolvedValue([]);

      await service.getMetrics();

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'request.completedAt IS NOT NULL',
      );
    });

    it('should calculate averages correctly', async () => {
      queryBuilder.getRawOne.mockResolvedValue({
        totalRequests: '100',
        totalTokensUsed: '50000',
        totalCost: '0.75',
      });
      queryBuilder.getRawMany.mockResolvedValue([]);

      const metrics = await service.getMetrics();

      expect(metrics.averageTokensPerRequest).toBe(500);
      expect(metrics.averageCostPerRequest).toBe(0.0075);
    });

    it('should round tokens and costs appropriately', async () => {
      queryBuilder.getRawOne.mockResolvedValue({
        totalRequests: '3',
        totalTokensUsed: '1234.567',
        totalCost: '0.018123',
      });
      queryBuilder.getRawMany.mockResolvedValue([]);

      const metrics = await service.getMetrics();

      expect(metrics.totalTokensUsed).toBe(1235); // Rounded
      expect(metrics.totalCost).toBe(0.018123); // Fixed to 6 decimals
      expect(metrics.averageTokensPerRequest).toBe(412); // Rounded
      expect(metrics.averageCostPerRequest).toBe(0.006041); // Fixed to 6 decimals
    });
  });

  describe('getDailyMetrics', () => {
    it('should return daily metrics correctly', async () => {
      const mockResults = [
        {
          date: new Date('2024-01-01T00:00:00Z'),
          requests: '5',
          tokensUsed: '2500',
          cost: '0.0375',
        },
        {
          date: new Date('2024-01-02T00:00:00Z'),
          requests: '3',
          tokensUsed: '1500',
          cost: '0.0225',
        },
      ];

      queryBuilder.getRawMany.mockResolvedValue(mockResults);

      const dailyMetrics = await (service as any).getDailyMetrics();

      expect(dailyMetrics).toHaveLength(2);
      expect(dailyMetrics[0].date).toBe('2024-01-01');
      expect(dailyMetrics[0].requests).toBe(5);
      expect(dailyMetrics[0].tokensUsed).toBe(2500);
      expect(dailyMetrics[0].cost).toBe(0.0375);
    });

    it('should handle string dates from DATE_TRUNC', async () => {
      const mockResults = [
        {
          date: '2024-01-01T00:00:00Z',
          requests: '5',
          tokensUsed: '2500',
          cost: '0.0375',
        },
      ];

      queryBuilder.getRawMany.mockResolvedValue(mockResults);

      const dailyMetrics = await (service as any).getDailyMetrics();

      expect(dailyMetrics[0].date).toBe('2024-01-01');
    });

    it('should filter daily metrics by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      queryBuilder.getRawMany.mockResolvedValue([]);

      await (service as any).getDailyMetrics(startDate, endDate);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'request.createdAt BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    });

    it('should filter daily metrics by client IP', async () => {
      const clientIp = '127.0.0.1';

      queryBuilder.getRawMany.mockResolvedValue([]);

      await (service as any).getDailyMetrics(undefined, undefined, clientIp);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'request.clientIp = :clientIp',
        { clientIp },
      );
    });

    it('should group by day and order chronologically', async () => {
      queryBuilder.getRawMany.mockResolvedValue([]);

      await (service as any).getDailyMetrics();

      expect(queryBuilder.select).toHaveBeenCalledWith(
        "DATE_TRUNC('day', request.createdAt)",
        'date',
      );
      expect(queryBuilder.groupBy).toHaveBeenCalledWith(
        "DATE_TRUNC('day', request.createdAt)",
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        "DATE_TRUNC('day', request.createdAt)",
        'ASC',
      );
    });
  });
});

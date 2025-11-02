import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from '../analytics.controller';
import { AnalyticsService } from '../analytics.service';
import { AnalyticsResponseDto } from '../dto/analytics-response.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: jest.Mocked<AnalyticsService>;

  const mockMetrics: AnalyticsResponseDto = new AnalyticsResponseDto({
    totalRequests: 10,
    totalTokensUsed: 5000,
    totalCost: 0.075,
    averageTokensPerRequest: 500,
    averageCostPerRequest: 0.0075,
    requestsByDay: [
      {
        date: '2024-01-01',
        requests: 5,
        tokensUsed: 2500,
        cost: 0.0375,
      },
      {
        date: '2024-01-02',
        requests: 5,
        tokensUsed: 2500,
        cost: 0.0375,
      },
    ],
  });

  beforeEach(async () => {
    const mockAnalyticsService = {
      getMetrics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    analyticsService = module.get(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return metrics without filters', async () => {
      analyticsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(analyticsService.getMetrics).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockMetrics);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      analyticsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics(startDate, endDate);

      expect(analyticsService.getMetrics).toHaveBeenCalledWith(
        startDate,
        endDate,
        undefined,
      );
      expect(result).toEqual(mockMetrics);
    });

    it('should filter by client IP', async () => {
      const clientIp = '127.0.0.1';
      analyticsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics(
        undefined,
        undefined,
        clientIp,
      );

      expect(analyticsService.getMetrics).toHaveBeenCalledWith(
        undefined,
        undefined,
        clientIp,
      );
      expect(result).toEqual(mockMetrics);
    });

    it('should filter by all parameters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const clientIp = '127.0.0.1';
      analyticsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics(startDate, endDate, clientIp);

      expect(analyticsService.getMetrics).toHaveBeenCalledWith(
        startDate,
        endDate,
        clientIp,
      );
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('date parsing', () => {
    it('should accept valid Date objects', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      analyticsService.getMetrics.mockResolvedValue(mockMetrics);

      await controller.getMetrics(startDate, endDate);

      expect(analyticsService.getMetrics).toHaveBeenCalledWith(
        startDate,
        endDate,
        undefined,
      );
    });
  });
});

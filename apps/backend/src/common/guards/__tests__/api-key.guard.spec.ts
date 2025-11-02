import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from '../api-key.guard';
import { AppConfig } from '../../../config/config.interface';
import { Request } from 'express';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let configService: jest.Mocked<ConfigService<{ app: AppConfig }>>;

  const validApiKey = 'test-api-key-12345';

  const createMockExecutionContext = (
    headers: Record<string, string | string[]>,
  ): ExecutionContext => {
    const request = {
      headers,
    } as unknown as Request;

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    configService = module.get(ConfigService);

    // Default mock implementation - returns valid config
    configService.get.mockImplementation((key: string) => {
      if (key === 'app') {
        return {
          apiKey: validApiKey,
        } as AppConfig;
      }
      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true when API key is valid', () => {
      const context = createMockExecutionContext({
        'x-api-key': validApiKey,
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('app');
    });

    it('should throw UnauthorizedException when API key header is missing', () => {
      const context = createMockExecutionContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('API key is missing');
    });

    it('should throw UnauthorizedException when API key is invalid', () => {
      const context = createMockExecutionContext({
        'x-api-key': 'invalid-api-key',
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid API key');
    });

    it('should throw UnauthorizedException when app config is not configured', () => {
      configService.get.mockReturnValue(undefined);

      const context = createMockExecutionContext({
        'x-api-key': validApiKey,
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'API key validation is not configured',
      );
    });

    it('should throw UnauthorizedException when app config returns null', () => {
      configService.get.mockReturnValue(null);

      const context = createMockExecutionContext({
        'x-api-key': validApiKey,
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'API key validation is not configured',
      );
    });

    it('should throw UnauthorizedException when x-api-key header is an array', () => {
      const context = createMockExecutionContext({
        'x-api-key': [validApiKey],
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('API key is missing');
    });
  });
});

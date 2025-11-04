import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AppConfig } from '../../config/config.interface';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService<{ app: AppConfig }>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    const validApiKey = this.configService.get<AppConfig>('app')?.apiKey;

    if (!validApiKey) {
      throw new UnauthorizedException('API key validation is not configured');
    }

    const apiKeyBuffer = Buffer.from(apiKey);
    const validApiKeyBuffer = Buffer.from(validApiKey);

    if (
      apiKeyBuffer.length !== validApiKeyBuffer.length ||
      !timingSafeEqual(apiKeyBuffer, validApiKeyBuffer)
    ) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  private extractApiKey(request: Request): string {
    const headerKey = request.headers['x-api-key'];

    if (headerKey && typeof headerKey === 'string') {
      return headerKey;
    }

    throw new UnauthorizedException('API key is missing');
  }
}

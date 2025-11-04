import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfig } from './config/config.interface';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  const configService =
    app.get<ConfigService<{ app: AppConfig }>>(ConfigService);
  const appConfig = configService.get<AppConfig>('app')!;

  app.use(helmet());

  // CORS configuration with proper validation
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || []
      : true;

  if (
    process.env.NODE_ENV === 'production' &&
    Array.isArray(allowedOrigins) &&
    allowedOrigins.length === 0
  ) {
    throw new Error(
      'ALLOWED_ORIGINS must be configured in production environment',
    );
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = appConfig.port;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();

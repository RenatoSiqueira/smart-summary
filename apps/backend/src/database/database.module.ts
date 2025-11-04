import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AppConfig } from '../config/config.interface';
import { SummaryRequest } from '../summary/entities/summary-request.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<{ app: AppConfig }>) => {
        const appConfig = configService.get<AppConfig>('app')!;
        const nodeEnv = appConfig.environment;
        const databaseUrl = appConfig.database.url;

        // Determine if SSL should be enabled
        // Disable SSL for local/internal database connections (postgres, localhost, 127.0.0.1)
        // Enable SSL only for production external database connections
        const isLocalDatabase = /postgres|localhost|127\.0\.0\.1/.test(
          databaseUrl,
        );
        const sslEnabled = nodeEnv === 'production' && !isLocalDatabase;

        return {
          type: 'postgres',
          url: databaseUrl,
          entities: [SummaryRequest],
          migrations: [join(__dirname, 'migrations', '**', '*{.ts,.js}')],
          synchronize: false,
          logging:
            nodeEnv === 'development'
              ? ['query', 'error', 'schema', 'warn']
              : ['error', 'warn'],
          migrationsRun: false,
          migrationsTableName: 'migrations',
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

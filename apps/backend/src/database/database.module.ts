import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/config.interface';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<{ app: AppConfig }>) => {
        const appConfig = configService.get<AppConfig>('app')!;
        const nodeEnv = appConfig.environment;

        return {
          type: 'postgres',
          url: appConfig.database.url,
          entities: [__dirname + '/entities/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
          synchronize: false,
          logging:
            nodeEnv === 'development'
              ? ['query', 'error', 'schema', 'warn']
              : ['error', 'warn'],
          migrationsRun: false,
          migrationsTableName: 'migrations',
          ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import appConfig from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { LLMModule } from './llm/llm.module';
import { SummaryModule } from './summary/summary.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    LLMModule,
    SummaryModule,
    AnalyticsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

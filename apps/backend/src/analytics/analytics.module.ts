import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { SummaryRequest } from '../summary/entities/summary-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SummaryRequest]), ConfigModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

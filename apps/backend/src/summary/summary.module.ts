import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';
import { SummaryRequest } from './entities/summary-request.entity';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SummaryRequest]),
    LLMModule,
    ConfigModule,
  ],
  controllers: [SummaryController],
  providers: [SummaryService],
  exports: [SummaryService],
})
export class SummaryModule {}

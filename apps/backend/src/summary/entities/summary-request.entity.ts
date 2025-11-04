import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('summary_requests')
@Index(['clientIp'])
@Index(['createdAt'])
@Index(['createdAt', 'clientIp'])
@Index(['completedAt', 'error'])
export class SummaryRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  text: string;

  @Column('text', { nullable: true })
  summary: string | null;

  @Column({ name: 'client_ip', type: 'varchar', nullable: true })
  clientIp: string | null;

  @Column({ name: 'tokens_used', type: 'integer', default: 0 })
  tokensUsed: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  cost: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;
}

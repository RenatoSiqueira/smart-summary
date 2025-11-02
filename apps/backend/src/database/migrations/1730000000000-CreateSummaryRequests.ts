import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSummaryRequests1730000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.createTable(
      new Table({
        name: 'summary_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'text',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'summary',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'client_ip',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'tokens_used',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'cost',
            type: 'decimal',
            precision: 10,
            scale: 6,
            default: 0,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'summary_requests',
      new TableIndex({
        name: 'IDX_summary_requests_client_ip',
        columnNames: ['client_ip'],
      }),
    );

    await queryRunner.createIndex(
      'summary_requests',
      new TableIndex({
        name: 'IDX_summary_requests_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex(
      'summary_requests',
      'IDX_summary_requests_created_at',
    );
    await queryRunner.dropIndex(
      'summary_requests',
      'IDX_summary_requests_client_ip',
    );

    // Drop table
    await queryRunner.dropTable('summary_requests');
  }
}

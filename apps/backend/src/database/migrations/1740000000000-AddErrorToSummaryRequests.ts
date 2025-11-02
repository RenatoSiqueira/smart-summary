import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddErrorToSummaryRequests1740000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'summary_requests',
      new TableColumn({
        name: 'error',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('summary_requests', 'error');
  }
}

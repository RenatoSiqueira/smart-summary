import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config({ path: ['.env.local', '.env'] });

export const typeormConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/database/entities/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/**/*{.ts,.js}'],
  synchronize: false,
  logging:
    process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'schema']
      : ['error'],
  migrationsRun: false,
  migrationsTableName: 'migrations',
};

const dataSource = new DataSource(typeormConfig);

export default dataSource;

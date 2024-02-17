import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();
const config: DataSourceOptions = {
  type: 'postgres',
  port: 5432,
  host: process.env.DATASOURCE_URL,
  username: process.env.DATASOURCE_USERNAME,
  password: process.env.DATASOURCE_PASSWORD,
  database: process.env.DATASOURCE_DATABASE,
  entities: ['**/*.entity.js'],
  migrations: ['dist/_migrations/*.js'],
  migrationsTableName: 'migrations',
  migrationsRun: false,
  synchronize: false,
  logging: true,
};

export default new DataSource(config);
export { config };

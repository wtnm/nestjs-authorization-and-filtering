import { Test, TestingModule } from '@nestjs/testing';
import { UserModule } from '../src/base/modules/user/user.module';
import { RoleModule } from '../src/base/modules/role/role.module';
import { AuthModule } from '../src/base/modules/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as cookieParser from 'cookie-parser';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '../src/base/modules/auth/helpers/auth.guard';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from '../src/all-exceptions.filter';
import { DataSourceOptions } from 'typeorm';
import { User } from '../src/base/modules/user/user.entity';
import { Role } from '../src/base/modules/role/role.entity';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env.test' });

export const config: DataSourceOptions = {
  port: 5432,
  host: process.env.DATASOURCE_URL,
  username: process.env.DATASOURCE_USERNAME,
  password: process.env.DATASOURCE_PASSWORD,
  database: process.env.DATASOURCE_DATABASE,
  logging: false,
  entities: [User, Role],
  synchronize: true,
  type: 'postgres',
  migrations: ['src/_migrations/*.ts'],
  migrationsRun: false,
  migrationsTableName: 'history',
};
export async function initApp(customConfig = config): Promise<[INestApplication, TestingModule]> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [UserModule, RoleModule, AuthModule, TypeOrmModule.forRoot(customConfig)],
  }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const authGuard = app.select(AuthModule).get(AuthGuard);
  app.useGlobalGuards(authGuard);
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));
  await app.init();
  return [app, moduleFixture];
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './base/modules/user/user.module';
import { AuthModule } from './base/modules/auth/auth.module';
import { RoleModule } from './base/modules/role/role.module';
import { config } from './ormconfig';

@Module({
  imports: [TypeOrmModule.forRoot(config), UserModule, AuthModule, RoleModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

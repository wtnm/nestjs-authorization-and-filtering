import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { JWT_SECRET } from '../../common/constants';
import { Reflector } from '@nestjs/core';
import { RoleModule } from '../role/role.module';
import { AuthGuard } from './helpers/auth.guard';
import { AuthCacheModule } from './auth.cache.module';

@Module({
  imports: [
    Reflector,
    UserModule,
    RoleModule,
    AuthCacheModule,
    JwtModule.register({
      global: true,
      secret: JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [AuthService, AuthGuard],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}

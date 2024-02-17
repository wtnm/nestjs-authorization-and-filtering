import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWT_SECRET } from '../../../common/constants';
import { Request } from 'express';
import { AuthEntity, AuthOperation, PUBLIC_ROUTE } from './auth.decorators';
import { Reflector } from '@nestjs/core';
import { UserService } from '../../user/user.service';
import { RoleService } from '../../role/role.service';
import { merge } from 'lodash';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { ObjectLiteral } from 'typeorm';
import { isArray } from 'class-validator';
import { AuthCacheService } from '../auth.cache.module';
import { UserNotFound } from '../../user/user.exceptions';
import { RoleNotFound } from '../../role/role.exceptions';
import { USER_SELF_MAGIC_VALUE } from '../auth.constants';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private userService: UserService,
    private roleService: RoleService,
    private authCacheService: AuthCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authEntity = this.reflector.get(AuthEntity, context.getClass());
    const authOperation = this.reflector.get(AuthOperation, context.getHandler());
    if (authEntity === PUBLIC_ROUTE || authOperation === PUBLIC_ROUTE) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new BadRequestException('Authorization token is missing');

    try {
      request['user'] = await this.jwtService.verifyAsync(token, {
        secret: JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException();
    }
    return await this.checkUserAuthAccess(request, authEntity, authOperation);
  }

  private async checkUserAuthAccess(request: any, entity: string, operation: string) {
    const { id } = request['user'];
    let fullAuthData = await this.authCacheService.get(`${id}`);
    if (!fullAuthData) {
      fullAuthData = await this.makeFullAuthData(id);
      await this.authCacheService.set(`${id}`, fullAuthData);
    }
    request['isSuperUser'] = fullAuthData['isSuperUser'];
    request['authData'] = request['isSuperUser'] ? true : fullAuthData?.[entity]?.[operation] ?? false;

    if (isObject(request['authData']?.filterRows)) {
      await this.replaceMagicValues(request, request['authData'].filterRows);
    }
    return !!request['authData'];
  }

  private async replaceMagicValues(request: ObjectLiteral, filterRows: ObjectLiteral) {
    const { id: selfUserId } = request['user'];
    Object.keys(filterRows).forEach((key) => {
      if (key.split('__')[0] === 'user_id') {
        const ids: number[] | number = filterRows[key];
        if (!isArray(ids)) {
          if (ids === USER_SELF_MAGIC_VALUE) filterRows[key] = selfUserId;
        } else {
          ids.forEach((val, idx) => {
            if (val === USER_SELF_MAGIC_VALUE) ids[idx] = selfUserId;
          });
        }
      }
    });

    return this.mapFilterKeys(filterRows);
  }

  private mapFilterKeys(restrictionFilter: ObjectLiteral): ObjectLiteral {
    return Object.fromEntries(Object.entries(restrictionFilter).map(([key, value]) => [key + '__restriction', value]));
  }
  private async makeFullAuthData(id) {
    const maybeUser = await this.userService.readOne({ id__exact: id });
    if (!maybeUser) throw new UserNotFound({ id });
    const { auth: userAuth, role, isSuperUser } = maybeUser;

    const maybeRole = await this.roleService.readOne({ id__exact: role });
    if (!maybeRole) throw new RoleNotFound({ id: role });
    const { auth: roleAuth } = maybeRole;
    // user with default role (0 - guest) cannot be superuser (for security reason)
    return merge(roleAuth, userAuth, { isSuperUser: role === 0 ? false : isSuperUser });
  }
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.cookies.access_token?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

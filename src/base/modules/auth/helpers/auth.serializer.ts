import { User } from '../../user/user.entity';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { isArray, isInstance } from 'class-validator';
import { ObjectLiteral } from 'typeorm';

@Injectable()
export class AuthSerializerInterceptor implements NestInterceptor {
  constructor(
    private toDto: any,
    private fromDto?: any,
  ) {}

  private removeCols(row: ObjectLiteral, excludeCols?: string[]) {
    if (!excludeCols || excludeCols.length === 0) return row;
    excludeCols.forEach((col) => delete row[col]);
    return row;
  }

  private toDtoInstance(value: any, excludeCols?: string[]) {
    const toDtoWithCheck = (value: any) => {
      return isInstance(value, this.fromDto ?? this.toDto)
        ? plainToInstance(this.toDto, this.removeCols(instanceToPlain(value), excludeCols))
        : value;
    };

    if (isArray(value)) return value.map((v) => toDtoWithCheck(v));
    else return toDtoWithCheck(value);
  }

  intercept(context: ExecutionContext, handler: CallHandler): Observable<any> {
    // you can write some code to run before request is handled
    return handler.handle().pipe(
      // data is the incoming user entity
      map((response: any) => {
        const request = context.switchToHttp().getRequest();
        const { excludeCols } = request['user'] || {};
        if (isObject(response) && response['data']) {
          return {
            ...response,
            data: response['data'].map((value: any) => this.toDtoInstance(value, excludeCols)),
          };
        }
        return { data: this.toDtoInstance(response, excludeCols) };
      }),
    );
  }
}

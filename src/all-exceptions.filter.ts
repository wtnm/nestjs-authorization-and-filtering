import { Catch, ArgumentsHost, ConflictException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof QueryFailedError && exception['code'] === '23505') {
      exception = new ConflictException(exception['detail']);
    }
    super.catch(exception, host);
  }
}

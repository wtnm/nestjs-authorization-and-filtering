import { NotFoundException } from '@nestjs/common';

export class UserNotFound extends NotFoundException {
  constructor(params?: any) {
    super('User not found' + params ? ' ' + JSON.stringify(params) : '');
  }
}

import { NotFoundException } from '@nestjs/common';

export class RoleNotFound extends NotFoundException {
  constructor(params: any) {
    super('Role not found' + params ? ' ' + JSON.stringify(params) : '');
  }
}

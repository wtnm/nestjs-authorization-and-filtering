/* eslint-disable @typescript-eslint/no-unused-vars */
import { Body, Controller, Get, Param, Post, Put, Query, Req, UseInterceptors } from '@nestjs/common';
import { RoleService } from './role.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleCreateDto, RoleReturnDto, RoleUpdateDto } from './role.dtos';
import { ReadResultDto } from '../../dtos/read-result.dto';
import { AuthEntity, AuthOperation } from '../auth/helpers/auth.decorators';
import { AuthSerializerInterceptor } from '../auth/helpers/auth.serializer';
import { Role } from './role.entity';
import { ObjectLiteral } from 'typeorm';
import { AuthBaseController } from '../auth/base/auth.base.controller';

@ApiTags('role')
@ApiBearerAuth()
@Controller('role')
@AuthEntity('role')
@UseInterceptors(new AuthSerializerInterceptor(RoleReturnDto, Role))
export class RoleController extends AuthBaseController {
  constructor(readonly roleService: RoleService) {
    super(roleService);
  }

  @Post()
  @AuthOperation('create')
  createOne(@Body() dto: RoleCreateDto, @Req() req: ObjectLiteral): Promise<Role> {
    return super.createOne(dto, req);
  }

  @Get()
  @AuthOperation('read')
  readMany(@Req() req: ObjectLiteral): Promise<ReadResultDto<Role>> {
    return super.readMany({}, req);
  }

  @Put(':id')
  @AuthOperation('update')
  async updateOne(@Param('id') id: number, @Body() dto: RoleUpdateDto, @Req() req: ObjectLiteral): Promise<Role> {
    return super.updateOne(id, dto, req);
  }
}

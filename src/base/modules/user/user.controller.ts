import { Body, Controller, Get, Param, Post, Put, Query, Req, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserCreateDto, UserReadFilterDto, UserReturnDto, UserUpdateDto } from './user.dtos';
import { AuthEntity, AuthOperation } from '../auth/helpers/auth.decorators';
import { User } from './user.entity';
import { AuthSerializerInterceptor } from '../auth/helpers/auth.serializer';
import { AuthBaseController } from '../auth/base/auth.base.controller';
import { ObjectLiteral } from 'typeorm';
import { ReadResultDto } from '../../dtos/read-result.dto';

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
@AuthEntity('user')
@UseInterceptors(new AuthSerializerInterceptor(UserReturnDto, User))
export class UserController extends AuthBaseController {
  constructor(readonly userService: UserService) {
    super(userService);
  }

  @Post()
  @AuthOperation('create')
  createOne(@Body() dto: UserCreateDto, @Req() req: ObjectLiteral): Promise<User> {
    return super.createOne(dto, req);
  }

  @Get()
  @AuthOperation('read')
  readMany(@Query() query: UserReadFilterDto, @Req() req: ObjectLiteral): Promise<ReadResultDto<User>> {
    return super.readMany(query, req);
  }

  @Put(':id')
  @AuthOperation('update')
  async updateOne(@Param('id') id: number, @Body() dto: UserUpdateDto, @Req() req: ObjectLiteral): Promise<User> {
    return super.updateOne(id, dto, req);
  }
}

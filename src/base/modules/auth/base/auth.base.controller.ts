import {
  Body,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { AuthOperation } from '../helpers/auth.decorators';
import { ObjectLiteral } from 'typeorm';
import { addRestrictions, authValidation } from '../helpers/auth.validation';
import { ReadResultDto } from '../../../dtos/read-result.dto';
import { FORBIDDEN_VALUE, NOT_FOUND_VALUE } from '../../../common/constants';
import { DeleteManyDto } from '../../../dtos/delete-many.dto';
import { ApiResponse } from '@nestjs/swagger';
import { AuthBaseService } from './auth.base.service';

export class AuthBaseController {
  constructor(private readonly service: AuthBaseService<any>) {}

  @Post()
  @AuthOperation('create')
  @ApiResponse({ status: 201, description: 'The record has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  createOne(@Body() dto: any, @Req() req: ObjectLiteral): Promise<any> {
    authValidation(dto, req['authData']);
    return this.service.createOne(dto as any);
  }

  @Get()
  @AuthOperation('read')
  @ApiResponse({ status: 200, description: 'Record retrieved successfully.' })
  readMany(@Query() query: any, @Req() req: ObjectLiteral): Promise<ReadResultDto<any>> {
    return this.service.readMany(addRestrictions(query, req['authData']));
  }

  @Get(':id')
  @AuthOperation('read')
  @ApiResponse({ status: 200, description: 'Record retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Record does not exist' })
  async readOne(@Param('id') id__exact: number, @Req() req: ObjectLiteral): Promise<any> {
    const maybeUser = await this.service.readOne(addRestrictions({ id__exact }, req['authData']));
    if (maybeUser === NOT_FOUND_VALUE) throw new NotFoundException(`Record with id ${id__exact} not found`);
    return maybeUser;
  }

  @Put(':id')
  @AuthOperation('update')
  @ApiResponse({ status: 200, description: 'Record updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Record does not exist' })
  async updateOne(@Param('id') id__exact: number, @Body() dto: any, @Req() req: ObjectLiteral): Promise<any> {
    authValidation(dto, req['authData']);
    const maybeUser = await this.service.updateOne(addRestrictions({ id__exact }, req['authData']), dto as any);
    if (maybeUser === NOT_FOUND_VALUE) throw new NotFoundException(`Record with id ${id__exact} not found`);
    if (maybeUser === FORBIDDEN_VALUE) throw new ForbiddenException();
    return maybeUser;
  }

  @Delete()
  @AuthOperation('delete')
  @ApiResponse({ status: 200, description: 'Records deleted successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async deleteMany(@Body() dto: DeleteManyDto, @Req() req: ObjectLiteral) {
    const result = await this.service.deleteMany(addRestrictions(dto, req['authData']));
    return result.affected;
  }
  @Delete(':id')
  @AuthOperation('delete')
  @ApiResponse({ status: 200, description: 'Record deleted successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async deleteOne(@Param('id') id: number, @Req() req: ObjectLiteral) {
    const result = await this.service.deleteMany(addRestrictions({ id__in: [id] }, req['authData']));
    return result.affected;
  }

  @Patch()
  @AuthOperation('delete')
  @ApiResponse({ status: 200, description: 'Records restored successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async restoreMany(@Body() dto: DeleteManyDto, @Req() req: ObjectLiteral) {
    const result = await this.service.restoreMany(addRestrictions(dto, req['authData']));
    return result.affected;
  }
  @Patch(':id')
  @AuthOperation('delete')
  @ApiResponse({ status: 200, description: 'Record restored successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async restoreOne(@Param('id') id: number, @Req() req: ObjectLiteral) {
    const result = await this.service.restoreMany(addRestrictions({ id__in: [id] }, req['authData']));
    return result.affected;
  }
}

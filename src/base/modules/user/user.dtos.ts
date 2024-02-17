import { OmitType, PartialType } from '@nestjs/swagger';
import { User } from './user.entity';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { WithPaginationDto } from '../../dtos/with-pagination.dto';
import { Exclude, Transform } from 'class-transformer';

export class UserReturnDto extends OmitType(User, ['password']) {
  @Exclude()
  @IsString()
  password: string;
}
export class UserUpdateDto extends PartialType(
  OmitType(User, ['id', 'relevance', 'created', 'updated', 'deletedAt'] as const),
) {}

export class UserCreateDto extends OmitType(User, [
  'id',
  'created',
  'password',
  'relevance',
  'updated',
  'deletedAt',
] as const) {
  @IsString()
  password: string;
}

export class UserReadFilterDto extends WithPaginationDto {
  @IsOptional()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => value.map((v) => parseInt(v)))
  id__in?: string;

  @IsOptional()
  @IsString()
  email__icontains?: string;

  @IsOptional()
  @IsString()
  name__icontains?: string;
}
export class UserLoginFilterDto {
  @IsOptional()
  @IsString()
  email__exact?: string;
}

export class UserCommonFilterDto {
  id__exact?: number;
}

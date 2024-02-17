import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class WithPaginationDto {
  @IsNumber()
  page: number = 1;
  @IsNumber()
  part: number = 20;
  @IsString()
  orderBy: string = 'id';
  @IsOptional()
  @IsBoolean()
  desc?: boolean;
}

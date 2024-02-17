import { IsArray, IsNotEmpty, IsNumber } from 'class-validator';

export class ReadResultDto<T> {
  @IsNotEmpty()
  @IsArray()
  data: T[];
  @IsNumber()
  @IsNotEmpty()
  count: number;
}

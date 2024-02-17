import { IsNumber } from 'class-validator';
export class DeleteManyDto {
  @IsNumber({}, { each: true })
  id__in: number[];
}

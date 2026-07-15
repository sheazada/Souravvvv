import { IsIn } from 'class-validator';

export class UpdateProductStatusDto {
  @IsIn(['active', 'inactive'])
  status!: string;
}

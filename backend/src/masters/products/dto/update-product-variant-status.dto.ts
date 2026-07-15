import { IsIn } from 'class-validator';

export class UpdateProductVariantStatusDto {
  @IsIn(['active', 'inactive'])
  status!: string;
}

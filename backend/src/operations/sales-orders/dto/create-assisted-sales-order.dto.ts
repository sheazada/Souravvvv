import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { CreateSalesOrderDto } from './create-sales-order.dto';

export class CreateAssistedSalesOrderDto extends CreateSalesOrderDto {
  @IsIn(['admin', 'salesperson'])
  source!: 'admin' | 'salesperson';

  @IsOptional()
  @IsUUID()
  enteredByEmployeeId?: string;
}

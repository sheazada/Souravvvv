import { IsString } from 'class-validator';

export class DeleteDraftSalesInvoiceDto {
  @IsString()
  reason!: string;
}

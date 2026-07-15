import { IsString } from 'class-validator';

export class CancelRetailerDebitNoteDto {
  @IsString()
  reason!: string;
}

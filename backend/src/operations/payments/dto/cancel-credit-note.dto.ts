import { IsString } from 'class-validator';

export class CancelCreditNoteDto {
  @IsString()
  reason!: string;
}

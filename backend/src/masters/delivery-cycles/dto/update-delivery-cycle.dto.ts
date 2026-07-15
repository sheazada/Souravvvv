import { PartialType } from '@nestjs/mapped-types';
import { CreateDeliveryCycleDto } from './create-delivery-cycle.dto';

export class UpdateDeliveryCycleDto extends PartialType(CreateDeliveryCycleDto) {}

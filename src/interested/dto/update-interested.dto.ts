import { PartialType } from '@nestjs/mapped-types';
import { CreateInterestedDto } from './create-interested.dto';

export class UpdateInterestedDto extends PartialType(CreateInterestedDto) {}

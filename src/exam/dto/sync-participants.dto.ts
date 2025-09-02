import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class SyncParticipantsDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  interestedIds?: string[];
}

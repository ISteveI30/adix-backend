import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateExamDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;
}

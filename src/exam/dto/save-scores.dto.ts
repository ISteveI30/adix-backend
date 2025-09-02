// src/exam/dto/save-scores.dto.ts
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsUUID, Max, Min, ValidateNested } from 'class-validator';

export class ScoreRowDto {
  @IsUUID('4')
  detailId!: string;

  // score es opcional y puede ser null. Si viene, debe ser entero 0..20
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  score?: number | null;
}

export class SaveScoresDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreRowDto)
  rows!: ScoreRowDto[];
}

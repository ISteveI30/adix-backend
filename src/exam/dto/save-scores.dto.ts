// src/exam/dto/save-scores.dto.ts
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsUUID, Max, Min, ValidateNested } from 'class-validator';


export class ScoreRowDto {
  @IsUUID('4') detailId!: string;

  @IsOptional() @IsInt() @Min(0) @Max(100) goodAnswers?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(100) wrongAnswers?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(400) totalScore?: number | null;
}

export class SaveScoresDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreRowDto)
  rows!: ScoreRowDto[];
}

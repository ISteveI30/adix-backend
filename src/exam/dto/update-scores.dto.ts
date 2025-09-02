import { Type } from 'class-transformer';
import { IsArray, ValidateNested, IsUUID, IsInt, Min, Max, IsOptional } from 'class-validator';

class ScoreEntry {
  @IsUUID('4')
  detailId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  score!: number | null;
}

export class UpdateScoresDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreEntry)
  items!: ScoreEntry[];
}

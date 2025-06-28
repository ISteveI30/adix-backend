import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateCareerDto {

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  scoreMin: number;

  @IsNumber()
  scoreMax: number;

  @IsNumber()
  vacants: number;

  @IsString()
  areaId: string;
}

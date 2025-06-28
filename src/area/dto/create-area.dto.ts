import { IsNotEmpty, IsString } from "class-validator";

export class CreateAreaDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

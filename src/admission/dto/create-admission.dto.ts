import { IsNotEmpty, IsString } from "class-validator";

export class CreateAdmissionDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  
}

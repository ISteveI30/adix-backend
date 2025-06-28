import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateInterestedDto {

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone1: string;

  @IsOptional()
  @IsString()
  phone2?: string;
}

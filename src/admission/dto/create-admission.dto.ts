import { IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateAdmissionDto {
  @IsString() name: string;
  @IsOptional() @IsDateString() startAt?: string;
  @IsOptional() @IsDateString() endAt?: string;
}
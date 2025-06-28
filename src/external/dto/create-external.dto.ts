import { IsString, IsNotEmpty } from 'class-validator';

export class CreateExternalDto {

  @IsString()
  dni: string

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;
}
import {  IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, MinLength } from "class-validator"

export class StudentDto {

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName      :string

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName  :string

  @IsString()
  @IsOptional()
  dni?     :string

  @IsEmail()
  @IsOptional()
  email?     :string  

  @IsString()
  @IsOptional()
  phone?     :string   

  @IsString()
  @IsOptional()
  address?   :string

  @IsOptional()
  img?       :string

  @IsString()
  @IsOptional()
  school?    :string

  @IsOptional()
  birthday?  :Date

  @IsUUID()
  tutorId    :string

}
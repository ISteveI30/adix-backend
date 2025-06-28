import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator"
import { TutorTypeList } from "../../common/enums/type-tutor.enum"

type TutorType = 'TUTOR' | 'PADRE' | 'MADRE' 


export class CreateTutorDto {
  @MaxLength(10)
  @MinLength(8)
  @IsNotEmpty()
  dni         : string   

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName        :string

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName    :string

  @IsEmail()
  @IsOptional()
  @MinLength(10)
  email      :string  

  @IsNotEmpty()
  @MinLength(9)
  phone1      :string 
  
  @IsString()
  @IsOptional()
  phone2?     :string

  @IsEnum(
    TutorTypeList,
    {message: `Invalid type. The type must be a valid value of ${TutorTypeList}`}
  )
  type        :TutorType

  @IsString()
  @IsOptional()
  address?     :string

  @IsString()
  @IsOptional()
  observation? :string 
}

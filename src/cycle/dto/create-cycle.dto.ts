import { IsDate, IsNotEmpty, IsOptional, IsString } from "class-validator"

export class CreateCycleDto {
  @IsString()
  @IsNotEmpty()
  name     :string 

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;

  @IsOptional()
  @IsDate()
  deletedAt?: Date;

  // enrollments  :Enrollment[]
  // exams        :Exam[]

}

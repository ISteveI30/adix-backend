import { IsDate, IsNotEmpty, IsOptional, IsString } from "class-validator"

export class CreateCycleDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsDate()
  @IsOptional()
  createdAt?: Date;

  @IsDate()
  @IsOptional()
  updatedAt?: Date;

  @IsOptional()
  @IsDate()
  deletedAt?: Date;

  // enrollments  :Enrollment[]
  // exams        :Exam[]
  @IsString()
//  @IsNotEmpty()
  @IsOptional()
  careerId?: string;

  @IsString()
  //@IsNotEmpty()
  @IsOptional()
  cycleId?: string;
}

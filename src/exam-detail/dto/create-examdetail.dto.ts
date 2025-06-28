import { IsUUID, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { StatusExam } from '@prisma/client'; 

export class CreateExamDetailDto {
  @IsUUID('4', { message: 'examId debe ser un UUID válido' })
  examId: string;

  @IsOptional()
  @IsUUID('4', { message: 'studentId debe ser un UUID válido' })
  studentId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'externalId debe ser un UUID válido' })
  externalId?: string;

  @IsOptional()
  @IsInt({ message: 'score debe ser un entero' })
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsEnum(StatusExam, { message: 'status no es válido' })
  status?: StatusExam;
}
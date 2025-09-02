import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { Modality, TypeExam } from '@prisma/client';

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsDateString({}, { message: 'startTime debe ser un ISO-8601 válido' })
  startTime?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endTime debe ser un ISO-8601 válido' })
  endTime?: string;

  @IsEnum(Modality, { message: 'modality debe ser PRESENCIAL, VIRTUAL o HIBRIDO' })
  modality: Modality;

  @IsEnum(TypeExam, { message: 'type debe ser DIARIO, SEMANAL o SIMULACRO' })
  type: TypeExam;

  @IsUUID('4', { message: 'cycleId debe ser un UUID válido' })
  cycleId: string;
}

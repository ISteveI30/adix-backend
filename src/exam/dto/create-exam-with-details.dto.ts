import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { Modality, StatusExam, TypeExam } from "@prisma/client";

export class CreateExamWithDetailsDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsEnum(Modality)
  modality: Modality;

  @IsEnum(TypeExam)
  type: TypeExam;

  @IsUUID('4')
  cycleId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  interestedIds?: string[];
}

export class CreateExamDetailDto {
  @IsUUID('4') examId: string;

  @IsOptional() @IsUUID('4') studentId?: string;
  @IsOptional() @IsUUID('4') externalId?: string;

  // Nuevos campos de notas (opcionales)
  @IsOptional() @IsInt() @Min(0) @Max(100) goodAnswers?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) wrongAnswers?: number;
  @IsOptional() @IsInt() @Min(0) @Max(400) totalScore?: number;

  @IsOptional() @IsEnum(StatusExam) status?: StatusExam;
}
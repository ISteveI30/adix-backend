import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { Modality, TypeExam } from "@prisma/client";

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

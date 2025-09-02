import { IsArray, IsEnum, IsOptional, IsString, IsUUID, ArrayNotEmpty, IsIn, ArrayUnique  } from "class-validator";
import { Modality, TypeExam } from "@prisma/client";

export class CreateExamWithDetailsDto {
  @IsString()
  title: string;

  @IsEnum(Modality)
  modality: Modality;

  @IsEnum(TypeExam)
  type: TypeExam;

  @IsUUID("4")
  cycleId: string;

  @IsOptional() @IsArray() @ArrayUnique() studentIds?: string[];

  @IsOptional() @IsArray() @ArrayUnique() interestedIds?: string[];
}

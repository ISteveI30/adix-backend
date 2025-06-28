import {
  IsUUID,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  IsString,
  IsDateString
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Modality, Shift } from '@prisma/client';

export class CreateEnrollmentDto {
  @IsDateString({}, { message: 'startDate debe estar en formato ISO o dd/MM/yyyy' })
    @Transform(({ value }) => {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString();
    })
  startDate: string;

  @IsDateString({}, { message: 'endDate debe estar en formato ISO o dd/MM/yyyy' })
  @Transform(({ value }) => {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
  })
  endDate: string;

  @IsUUID('4', { message: 'studentId debe ser un UUID válido' })
  studentId: string;

  @IsUUID('4', { message: 'cycleId debe ser un UUID válido' })
  cycleId: string;

  @IsUUID('4', { message: 'admissionId debe ser un UUID válido' })
  admissionId: string;

  @IsUUID('4', { message: 'careerId debe ser un UUID válido' })
  careerId: string;

  @IsEnum(Modality, { message: `Modality inválida. Debe ser: ${Object.values(Modality).join(', ')}` })
  modality: Modality;

  @IsEnum(Shift, { message: `Shift inválido. Debe ser: ${Object.values(Shift).join(', ')}` })
  shift: Shift;

  @IsBoolean({ message: 'credit debe ser un valor booleano' })
  credit: boolean;

  @IsBoolean({ message: 'paymentCarnet debe ser un valor booleano' })
  paymentCarnet: boolean;

  @IsNumber({}, { message: 'carnetCost debe ser un número válido' })
  @Min(0, { message: 'carnetCost no puede ser negativo' })
  carnetCost: number;

  @IsNumber({}, { message: 'totalCost debe ser un número válido' })
  @Min(0, { message: 'totalCost no puede ser negativo' })
  totalCost: number;

  @IsOptional()
  @IsNumber({}, { message: 'initialPayment debe ser un número válido' })
  @Min(0, { message: 'initialPayment no puede ser negativo' })
  initialPayment?: number;

  @IsOptional()
  @IsNumber({}, { message: 'discounts debe ser un número válido' })
  @Min(0, { message: 'discounts no pueden ser negativos' })
  discounts?: number;

  @IsOptional()
  @IsString({ message: 'notes debe ser un texto' })
  notes?: string;

  @IsOptional()
  @IsNumber({}, { message: 'numInstallments debe ser un número válido' })
  @Min(1, { message: 'numInstallments debe ser al menos 1' })
  numInstallments?: number;

  // // ✅ Datos del Tutor
  // @ValidateNested()
  // @Type(() => CreateTutorDto)
  // tutor: CreateTutorDto;

  // // ✅ Datos del Estudiante
  // @ValidateNested()
  // @Type(() => StudentDto)
  // student: StudentDto;
}

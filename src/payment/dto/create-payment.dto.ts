import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import {  IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class CreatePaymentDto {
  @IsUUID()
  accountReceivableId: string;

  @IsString()
  invoiceNumber: string;

  @IsDateString({}, { message: 'dueDate debe estar en formato ISO o dd/MM/yyyy' })
  @Transform(({ value }) => {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
  })
  dueDate: string;

  @IsNumber()
  @Min(0, { message: 'carnetCost no puede ser negativo' })
  amountPaid: number;

  @IsDateString({}, { message: 'dueDate debe estar en formato ISO o dd/MM/yyyy' })
  @Transform(({ value }) => {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
  })
  paymentDate: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

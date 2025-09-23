// src/exam/dto/save-payments.dto.ts
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';

export type PaymentMethod = 'YAPE' | 'PLIN' | 'RECIBO';
export type PaymentStatus = 'PAGO' | 'DEBE';

export class PaymentRowDto {
  @IsUUID('4')
  detailId!: string;

  // Por defecto 0; no negativos
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amountPaid?: number | null;

  @IsOptional()
  @IsIn(['YAPE', 'PLIN', 'RECIBO'])
  typePaid?: PaymentMethod | null;

  @IsOptional()
  @IsIn(['PAGO', 'DEBE'])
  statusPaid?: PaymentStatus | null;
}

export class SavePaymentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentRowDto)
  rows!: PaymentRowDto[];
}

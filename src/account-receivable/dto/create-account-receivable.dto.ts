import { PaymentStatus } from "@prisma/client";
import { IsDate, IsDecimal, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateAccountReceivableDto {
  @IsUUID()
  studentId: string;

  @IsDecimal()
  totalAmount: number;

  @IsDecimal()
  pendingBalance?: number;

  @IsString()
  concept: string;

  @IsDate()
  dueDate: Date;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}

// export class UpdateAccountReceivableDto {
//   @IsOptional()
//   @IsDecimal()
//   pendingBalance?: number;

//   @IsOptional()
//   @IsEnum(PaymentStatus)
//   status?: PaymentStatus;
// }
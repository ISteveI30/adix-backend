import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsUUID } from "class-validator";
import { Transform } from 'class-transformer';
import { StatusAttendance } from "@prisma/client";

export class CreateAttendanceDto {
    @IsUUID('4', { message: 'studentId debe ser un UUID válido' })
    studentId: string;

    @IsNotEmpty()
    date: string;

    @IsBoolean()
    present: boolean;
    
    @IsNotEmpty()
    status: StatusAttendance;
}








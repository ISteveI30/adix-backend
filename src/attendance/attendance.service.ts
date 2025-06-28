import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAttendanceDto } from './dto/crate-attendance.dto';

@Injectable()
export class AttendanceService {
    constructor(
        private readonly prismaService: PrismaService,
    ) { }


    async createAttendance(dto: CreateAttendanceDto) {
        return await this.prismaService.attendance.create({
            data: {
                ...dto
            },
        });
    }

} 

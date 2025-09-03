import { Body, Controller, Param, Post, Get, Patch, Query } from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import { CreateAttendanceDto } from "./dto/crate-attendance.dto";

@Controller('attendance')
export class AttendanceController {
    constructor(private readonly svc: AttendanceService) { }

    // Registrar/actualizar la asistencia de un alumno hoy
    @Post()
    create(@Body() dto: CreateAttendanceDto) {
        return this.svc.createOrUpdateAttendance(dto);
    }

    // Sembrar FALTAS del día para todos los matriculados en la última admisión
    @Post('seed-today')
    seedToday() {
        return this.svc.seedTodayAbsences();
    }

    // Listar tardanzas del día (filtros area/career). Por defecto, solo última admisión.
    @Get('tardies')
    tardies(
        @Query('areaId') areaId?: string,
        @Query('careerId') careerId?: string,
        @Query('onlyLatestAdmission') onlyLatestAdmission: string = 'true',
    ) {
        return this.svc.listTodayTardies({
            areaId, careerId,
            onlyLatestAdmission: onlyLatestAdmission !== 'false',
        });
    }

    // Justificar una tardanza
    @Patch(':id/justify-tardiness')
    justify(@Param('id') id: string) {
        return this.svc.justifyTardiness(id);
    }
}

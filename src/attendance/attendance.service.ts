import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAttendanceDto } from './dto/crate-attendance.dto';
import { Shift, StatusAttendance } from '@prisma/client';

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

    private limaStartEnd(date = new Date()) {
        const str = date.toLocaleString('en-US', { timeZone: 'America/Lima' });
        const lima = new Date(str);
        const start = new Date(lima); start.setHours(0, 0, 0, 0);
        const end = new Date(lima); end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    private async getLastAdmissionId(): Promise<string> {
        // prioriza startAt; si es null, usa createdAt más reciente
        const byStart = await this.prismaService.admission.findFirst({
            where: { deletedAt: null },
            orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
        });
        if (!byStart) throw new NotFoundException('No hay admisiones');
        return byStart.id;
    }

    private statusByHourAndShift(date: Date, shift: Shift): StatusAttendance {
        const str = date.toLocaleString('en-US', { timeZone: 'America/Lima' });
        const lima = new Date(str);
        const h = lima.getHours();

        // Reglas simples (puedes ajustar luego):
        // MAÑANA: 07:00-08:59 ASISTIO, 09:00-12:59 TARDANZA
        // TARDE : 13:00-14:59 ASISTIO, 15:00-20:00 TARDANZA
        // NOCHE : 18:00-19:59 ASISTIO, 20:00-22:00 TARDANZA (ajustable)
        if (shift === 'MANANA') {
            if (h >= 7 && h < 9) return StatusAttendance.ASISTIO;
            if (h >= 9 && h < 13) return StatusAttendance.TARDANZA;
            return StatusAttendance.FALTA;
        }
        if (shift === 'TARDE') {
            if (h >= 13 && h < 15) return StatusAttendance.ASISTIO;
            if (h >= 15 && h <= 20) return StatusAttendance.TARDANZA;
            return StatusAttendance.FALTA;
        }
        // NOCHE
        if (h >= 18 && h < 20) return StatusAttendance.ASISTIO;
        if (h >= 20 && h <= 22) return StatusAttendance.TARDANZA;
        return StatusAttendance.FALTA;
    }

    // 1) Sembrar FALTAS para todos los matriculados en la última admisión (si no tienen registro hoy)
    async seedTodayAbsences() {
        const { start, end } = this.limaStartEnd();
        const lastAdmissionId = await this.getLastAdmissionId();

        // ids de estudiantes con matrícula activa en la última admisión
        const enrolls = await this.prismaService.enrollment.findMany({
            where: { deletedAt: null, admissionId: lastAdmissionId },
            select: { studentId: true },
        });
        const studentIds = Array.from(new Set(enrolls.map(e => e.studentId)));
        if (studentIds.length === 0) return { created: 0 };

        // ya tienen asistencia hoy
        const already = await this.prismaService.attendance.findMany({
            where: {
                studentId: { in: studentIds },
                date: { gte: start, lte: end },
                deletedAt: null,
            },
            select: { studentId: true },
        });
        const withToday = new Set(already.map(a => a.studentId));

        const toCreate = studentIds
            .filter(id => !withToday.has(id))
            .map(id => ({
                studentId: id,
                date: start,                       // 00:00 Lima (marca del día)
                present: false,
                status: StatusAttendance.FALTA,
            }));

        if (toCreate.length === 0) return { created: 0 };

        const res = await this.prismaService.attendance.createMany({ data: toCreate, skipDuplicates: true });
        return { created: res.count };
    }

    // 2) Registrar/actualizar asistencia de un estudiante hoy
    async createOrUpdateAttendance(dto: CreateAttendanceDto) {
        const { start, end } = this.limaStartEnd();
        // Buscar matrícula más reciente para conocer el turno
        const lastEnroll = await this.prismaService.enrollment.findFirst({
            where: { studentId: dto.studentId, deletedAt: null },
            orderBy: { startDate: 'desc' },
            select: { shift: true },
        });
        const shift = lastEnroll?.shift ?? 'MANANA';
        const status = this.statusByHourAndShift(new Date(), shift);

        const existing = await this.prismaService.attendance.findFirst({
            where: { studentId: dto.studentId, date: { gte: start, lte: end }, deletedAt: null },
        });

        if (existing) {
            // actualizar
            return this.prismaService.attendance.update({
                where: { id: existing.id },
                data: {
                    date: new Date(),                        // hora real de marcado
                    present: status !== StatusAttendance.FALTA,
                    status,
                },
            });
        }

        // si no existe (por si no se sembró): crear
        return this.prismaService.attendance.create({
            data: {
                studentId: dto.studentId,
                date: new Date(),
                present: status !== StatusAttendance.FALTA,
                status,
            },
        });
    }

    // 3) Listar solo tardanzas del día (con filtros)
    async listTodayTardies(params: { areaId?: string; careerId?: string; onlyLatestAdmission?: boolean; }) {
        const { start, end } = this.limaStartEnd();
        const lastAdmissionId = params.onlyLatestAdmission ? await this.getLastAdmissionId() : undefined;

        return this.prismaService.attendance.findMany({
            where: {
                deletedAt: null,
                date: { gte: start, lte: end },
                status: StatusAttendance.TARDANZA,
                student: {
                    deletedAt: null,
                    enrollments: {
                        some: {
                            deletedAt: null,
                            ...(lastAdmissionId ? { admissionId: lastAdmissionId } : {}),
                            ...(params.careerId ? { careerId: params.careerId } : {}),
                            ...(params.areaId ? { career: { areaId: params.areaId } } : {}),
                        },
                    },
                },
            },
            include: {
                student: {
                    select: {
                        id: true, firstName: true, lastName: true, dni: true,
                        enrollments: {
                            orderBy: { startDate: 'desc' }, take: 1,
                            select: { career: { select: { name: true } }, admission: { select: { name: true } } },
                        },
                    },
                },
            },
            orderBy: { date: 'desc' },
        });
    }

    // 4) Justificar tardanza
    async justifyTardiness(attendanceId: string) {
        const att = await this.prismaService.attendance.findUnique({ where: { id: attendanceId } });
        if (!att) throw new NotFoundException('Asistencia no encontrada');
        if (att.status !== StatusAttendance.TARDANZA) {
            throw new NotFoundException('Solo se pueden justificar registros con estado TARDANZA');
        }
        return this.prismaService.attendance.update({
            where: { id: attendanceId },
            data: { status: StatusAttendance.TARDANZA_JUSTIFICADA, present: true },
        });
    }

} 

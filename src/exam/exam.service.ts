import { PrismaService } from "src/prisma/prisma.service";
import { CreateExamDto } from "./dto/create-exam.dto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateExamWithDetailsDto } from "./dto/create-exam-with-details.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";
import { SyncParticipantsDto } from "./dto/sync-participants.dto";
import { UpdateScoresDto } from "./dto/update-scores.dto";
import { ScoreRowDto } from "./dto/save-scores.dto";
import { PaymentRowDto } from "./dto/save-payments.dto";

@Injectable()
export class ExamService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(dto: CreateExamDto) {
    return this.prismaService.exam.create({ data: { ...dto } });
  }

  async createWithDetails(dto: CreateExamWithDetailsDto) {
    return this.prismaService.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          title: dto.title,
          modality: dto.modality,
          type: dto.type,
          cycleId: dto.cycleId,
        },
      });

      let createdStudents = 0;
      let createdInterested = 0;

      if (dto.studentIds?.length) {
        const res = await tx.examDetail.createMany({
          data: dto.studentIds.map((studentId) => ({
            examId: exam.id,
            studentId,
          })),
          skipDuplicates: true,
        });
        createdStudents = res.count;
      }

      if (dto.interestedIds?.length) {
        const res = await tx.examDetail.createMany({
          data: dto.interestedIds.map((interestedId) => ({
            examId: exam.id,
            interestedId,
          })),
          skipDuplicates: true,
        });
        createdInterested = res.count;
      }

      return { exam, createdStudents, createdInterested };
    });
  }

  async summary() {
    const rows = await this.prismaService.exam.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        title: true,
        modality: true,
        _count: { select: { examdetails: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(r => ({
      id: r.id,
      title: r.title,
      modality: r.modality,
      assigned: r._count.examdetails,
    }));
  }

  async update(id: string, dto: UpdateExamDto) {
    const exam = await this.prismaService.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('Exam not found');

    return this.prismaService.exam.update({
      where: { id },
      data: { title: dto.title ?? exam.title },
    });
  }

  async roster(examId: string) {
    const exam = await this.prismaService.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    const details = await this.prismaService.examDetail.findMany({
      where: { examId },
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true,
            enrollments: {
              where: { cycleId: exam.cycleId },
              take: 1,
              orderBy: { startDate: 'desc' },
              select: { career: { select: { name: true, id: true, areaId: true } } }
            }
          }
        },
        interested: {
          select: {
            id: true, firstName: true, lastName: true,
            career: { select: { id: true, name: true, areaId: true } }
          }
        },
      },
      orderBy: { registered: 'asc' }
    });

    return details.map(d => {
      const isStudent = !!d.student;
      const career = isStudent
        ? d.student?.enrollments?.[0]?.career
        : d.interested?.career;

      return {
        detailId: d.id,
        personKey: d.studentId ?? `ext-${d.interestedId}`,
        firstName: d.student?.firstName ?? d.interested?.firstName ?? '',
        lastName: d.student?.lastName ?? d.interested?.lastName ?? '',
        type: isStudent ? 'Matriculado' : 'Externo',
        careerName: career?.name ?? '-',
        goodAnswers: d.goodAnswers ?? null,
        wrongAnswers: d.wrongAnswers ?? null,
        totalScore: d.totalScore ?? null,

        // NUEVOS CAMPOS DE PAGO
        amountPaid: d.amountPaid != null ? Number(d.amountPaid) : null,
        typePaid: d.typePaid ?? null,
        statusPaid: d.statusPaid ?? null,
      };
    });
  }

  async addParticipants(examId: string, dto: SyncParticipantsDto) {
    const exam = await this.prismaService.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    const txs = [];
    if (dto.studentIds?.length) {
      txs.push(this.prismaService.examDetail.createMany({
        data: dto.studentIds.map(id => ({ examId, studentId: id })),
        skipDuplicates: true,
      }));
    }
    if (dto.interestedIds?.length) {
      txs.push(this.prismaService.examDetail.createMany({
        data: dto.interestedIds.map(id => ({ examId, interestedId: id })),
        skipDuplicates: true,
      }));
    }
    if (txs.length) await this.prismaService.$transaction(txs);
    return { added: (dto.studentIds?.length ?? 0) + (dto.interestedIds?.length ?? 0) };
  }

  async removeParticipants(examId: string, dto: SyncParticipantsDto) {
    const exam = await this.prismaService.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    const txs = [];
    if (dto.studentIds?.length) {
      txs.push(this.prismaService.examDetail.deleteMany({
        where: { examId, studentId: { in: dto.studentIds } },
      }));
    }
    if (dto.interestedIds?.length) {
      txs.push(this.prismaService.examDetail.deleteMany({
        where: { examId, interestedId: { in: dto.interestedIds } },
      }));
    }
    if (txs.length) await this.prismaService.$transaction(txs);
    return { removed: (dto.studentIds?.length ?? 0) + (dto.interestedIds?.length ?? 0) };
  }

  async syncParticipants(examId: string, dto: SyncParticipantsDto) {
    const exam = await this.prismaService.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    const current = await this.prismaService.examDetail.findMany({
      where: { examId },
      select: { id: true, studentId: true, interestedId: true },
    });

    const desiredStudents = new Set(dto.studentIds ?? []);
    const desiredExternals = new Set(dto.interestedIds ?? []);

    const currentStudents = new Set(current.filter(x => x.studentId).map(x => x.studentId!));
    const currentExternals = new Set(current.filter(x => x.interestedId).map(x => x.interestedId!));

    const toAddStudents = [...desiredStudents].filter(id => !currentStudents.has(id));
    const toRemoveStudents = [...currentStudents].filter(id => !desiredStudents.has(id));

    const toAddExternals = [...desiredExternals].filter(id => !currentExternals.has(id));
    const toRemoveExternals = [...currentExternals].filter(id => !desiredExternals.has(id));

    await this.prismaService.$transaction([
      this.prismaService.examDetail.createMany({
        data: toAddStudents.map(studentId => ({ examId, studentId })),
        skipDuplicates: true,
      }),
      this.prismaService.examDetail.createMany({
        data: toAddExternals.map(interestedId => ({ examId, interestedId })),
        skipDuplicates: true,
      }),
      this.prismaService.examDetail.deleteMany({
        where: { examId, studentId: { in: toRemoveStudents.length ? toRemoveStudents : undefined } },
      }),
      this.prismaService.examDetail.deleteMany({
        where: { examId, interestedId: { in: toRemoveExternals.length ? toRemoveExternals : undefined } },
      }),
    ]);

    return {
      added: toAddStudents.length + toAddExternals.length,
      removed: toRemoveStudents.length + toRemoveExternals.length
    };
  }

  /** Actualiza notas (score) en batch */
  async updateScores(examId: string, dto: UpdateScoresDto) {
    const ops = dto.items.map(i => this.prismaService.examDetail.update({
      where: { id: i.detailId },
      data: {
        goodAnswers: i.goodAnswers ?? null,
        wrongAnswers: i.wrongAnswers ?? null,
        totalScore: i.totalScore ?? null,
      }
    }));
    await this.prismaService.$transaction(ops);
    return { updated: dto.items.length };
  }

  async saveScores(examId: string, rows: ScoreRowDto[]) {
    const ids = rows.map(r => r.detailId);
    const valid = await this.prismaService.examDetail.findMany({
      where: { examId, id: { in: ids } }, select: { id: true },
    });
    const ok = new Set(valid.map(v => v.id));

    const txs = rows.filter(r => ok.has(r.detailId)).map(r =>
      this.prismaService.examDetail.update({
        where: { id: r.detailId },
        data: {
          goodAnswers: r.goodAnswers ?? null,
          wrongAnswers: r.wrongAnswers ?? null,
          totalScore: r.totalScore ?? null,
        }
      })
    );
    await this.prismaService.$transaction(txs);
    return { updated: txs.length };
  }

  /** Guarda/actualiza pagos del detalle del examen */
  async savePayments(examId: string, rows: PaymentRowDto[]) {
    const ids = rows.map(r => r.detailId);
    const valid = await this.prismaService.examDetail.findMany({
      where: { examId, id: { in: ids } },
      select: { id: true },
    });
    const ok = new Set(valid.map(v => v.id));

    const txs = rows
      .filter(r => ok.has(r.detailId))
      .map(r =>
        this.prismaService.examDetail.update({
          where: { id: r.detailId },
          data: {
            amountPaid: r.amountPaid ?? null,
            typePaid: r.typePaid ?? null,
            statusPaid: r.statusPaid ?? null,
          },
        })
      );

    if (txs.length) await this.prismaService.$transaction(txs);
    return { updated: txs.length };
  }

  async softDelete(id: string) {
    const exam = await this.prismaService.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('Exam not found');
    await this.prismaService.exam.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  async findOne(id: string) {
    const exam = await this.prismaService.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async findAll() {
    return this.prismaService.exam.findMany({ where: { deletedAt: null } });
  }
}

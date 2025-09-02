import { PrismaService } from "src/prisma/prisma.service";
import { CreateExamDto } from "./dto/create-exam.dto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateExamDetailDto } from "../exam-detail/dto/create-examdetail.dto";
import { CreateExamWithDetailsDto } from "./dto/create-exam-with-details.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";
import { SyncParticipantsDto } from "./dto/sync-participants.dto";
import { UpdateScoresDto } from "./dto/update-scores.dto";
import { ScoreRowDto } from "./dto/save-scores.dto";

@Injectable()
export class ExamService {
  constructor(
    private readonly prismaService: PrismaService,
  ) { }

  async create(dto: CreateExamDto) {
    return this.prismaService.exam.create({
      data: {
        ...dto
      },
    });
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
        _count: { select: { examdetails: true } }, // cuenta studentId + interestedId
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

  /** Lista de asignados con detalleId + score para edición de notas */
  async roster(examId: string) {
    const exam = await this.prismaService.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    const details = await this.prismaService.examDetail.findMany({
      where: { examId },
      include: {
        student: true,
        interested: true,
      },
      orderBy: { registered: 'asc' }
    });

    return details.map(d => ({
      detailId: d.id,
      personKey: d.studentId ?? `ext-${d.interestedId}`, // clave para front
      firstName: d.student?.firstName ?? d.interested?.firstName ?? '',
      lastName: d.student?.lastName ?? d.interested?.lastName ?? '',
      type: d.studentId ? 'Matriculado' : 'Externo',
      score: d.score ?? null,
    }));
  }

  /** Reemplaza/“sincroniza” los asignados del examen */
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
      // add
      this.prismaService.examDetail.createMany({
        data: toAddStudents.map(studentId => ({ examId, studentId })),
        skipDuplicates: true,
      }),
      this.prismaService.examDetail.createMany({
        data: toAddExternals.map(interestedId => ({ examId, interestedId })),
        skipDuplicates: true,
      }),
      // remove
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
    const ops = dto.items.map(i =>
      this.prismaService.examDetail.update({
        where: { id: i.detailId },
        data: { score: i.score ?? null }
      })
    );
    await this.prismaService.$transaction(ops);
    return { updated: dto.items.length };
  }

  async saveScores(examId: string, rows: ScoreRowDto[]) {
    const ids = rows.map(r => r.detailId);

    const valid = await this.prismaService.examDetail.findMany({
      where: { examId, id: { in: ids } },
      select: { id: true },
    });
    const allowed = new Set(valid.map(v => v.id));

    const txs = rows
      .filter(r => allowed.has(r.detailId))
      .map(r =>
        this.prismaService.examDetail.update({
          where: { id: r.detailId },
          data: { score: r.score ?? null }, // undefined -> null
        }),
      );

    await this.prismaService.$transaction(txs);
    return { updated: txs.length };
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


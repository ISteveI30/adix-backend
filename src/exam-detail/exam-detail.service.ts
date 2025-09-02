import { PrismaService } from "src/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { CreateExamDetailDto } from "../exam-detail/dto/create-examdetail.dto";
import { StatusExam } from "@prisma/client";

@Injectable()
export class ExamDetailService {
  constructor(
    private readonly prismaService: PrismaService,
  ) { }

  // Crear un detalle individual
  async create(examDetdto: CreateExamDetailDto) {
    return await this.prismaService.examDetail.create({
      data: {
        ...examDetdto,
      },
    });
  }

  async assignStudents(examId: string, studentIds: string[]) {
    const data = studentIds.map(id => ({
      examId,
      studentId: id,
    }));

    return this.prismaService.examDetail.createMany({
      data,
      skipDuplicates: true,
    });
  }
  async getByExam(examId: string) {
    return this.prismaService.examDetail.findMany({ where: { examId } });
  }

  async assignInterested(examId: string, interestedIds: string[]) {
    const data = interestedIds.map(id => ({ examId, interestedId: id }));
    return this.prismaService.examDetail.createMany({ data, skipDuplicates: true });
  }


  async getAssignableStudents(examId: string) {
    const exam = await this.prismaService.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new Error("Examen no encontrado");

    if (exam.type === "SIMULACRO") {
      return this.prismaService.interested.findMany({
        where: { deletedAt: null },
        select: { id: true, firstName: true, lastName: true },
      });
    } else {
      return this.prismaService.student.findMany({
        where: { deletedAt: null },
        select: { id: true, firstName: true, lastName: true },
      });
    }
  }

}

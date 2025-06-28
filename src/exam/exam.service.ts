import { PrismaService } from "src/prisma/prisma.service";
import { CreateExamDto } from "./dto/create-exam.dto";
import { Injectable } from "@nestjs/common";
import { CreateExamDetailDto } from "../exam-detail/dto/create-examdetail.dto";

@Injectable()
export class ExamService {
  constructor(
    private readonly prismaService: PrismaService,
  ) { }

  async create(examdto: CreateExamDto) {

    const data = await this.prismaService.exam.create({
      data: {
        ...examdto,
      },
    });
    return data;
  }

}
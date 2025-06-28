import { PrismaService } from "src/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { CreateExamDetailDto } from "../exam-detail/dto/create-examdetail.dto";

@Injectable()
export class ExamDetailService {
  constructor(
    private readonly prismaService: PrismaService,
  ) { }

  async create(examDetdto: CreateExamDetailDto) {

    const data = await this.prismaService.examDetail.create({
      data: {
        ...examDetdto,
      },
    });
    return data;
  }

}
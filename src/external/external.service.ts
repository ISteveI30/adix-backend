import { CreateExamDetailDto } from "src/exam-detail/dto/create-examdetail.dto";
import { CreateExternalDto } from "./dto/create-external.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ExternalService {
  constructor(
    private readonly prismaService: PrismaService,
  ) { }

  async create(external: CreateExternalDto) {

    const data = await this.prismaService.external.create({
      data: {
        ...external,
      },
    });
    return data;
  }

}
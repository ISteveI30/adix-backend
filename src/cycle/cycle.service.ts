import { Injectable } from '@nestjs/common';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CycleService {

  constructor(
    private prismaService: PrismaService
  ) { }

  create(createCycleDto: CreateCycleDto) {
    return this.prismaService.cycle.create({ data: createCycleDto });
  }

  findAll() {
    return this.prismaService.cycle.findMany(
      { where: { deletedAt: null } }
    );
  }


  //findOne(id: string) {
  //  return this.prismaService.cycle.findUnique(
  //    { where: { id, deletedAt: null } });
  //}

  findOne(id: string) {
    return this.prismaService.cycle.findFirst({
      where: { id, deletedAt: null },
    });
  }

  update(id: string, updateCycleDto: UpdateCycleDto) {
    return this.prismaService.cycle.update({
      where: { id },
      data: updateCycleDto,
    });
  }

  remove(id: string) {
    return this.prismaService.cycle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

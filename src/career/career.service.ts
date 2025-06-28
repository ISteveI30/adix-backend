import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCareerDto } from './dto/create-career.dto';
import { UpdateCareerDto } from './dto/update-career.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CareerService {

  constructor(private prisma: PrismaService) {}

  create(createCareerDto: CreateCareerDto) {
    return this.prisma.career.create({
      data: createCareerDto
    });
  }

  findAll() {
    return this.prisma.career.findMany(
      {
        include: {
          area: true,
          enrollments: true
        }
      }
    );
  }

  async findOne(id: string) {
    const result = await this.prisma.career.findUnique({
      where: { id },
      include: {
        area: true,
        enrollments: true
      }
    });
    if (!result) throw new NotFoundException(`Carrera con id ${id} no encontrada`);
    return result;
  }

  update(id: string, updateCareerDto: UpdateCareerDto) {
    return this.prisma.career.update({
      where: { id },
      data: updateCareerDto
    });
  }

  remove(id: string) {
    return this.prisma.career.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}

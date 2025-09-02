import { Injectable } from '@nestjs/common';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AreaService {

  constructor(
    private readonly prisma: PrismaService
  ) { }

  async create(createAreaDto: CreateAreaDto) {
    return await this.prisma.area.create({
      data: createAreaDto
    });
  }

  async findAll() {
    return await this.prisma.area.findMany(
      {
        include: {
          careers: true
        }
      }
    );
  }

  async findOne(id: string) {
    const result = await this.prisma.area.findUnique({
      where: {
        id
      },
      include: {
        careers: true
      }
    });
    return result;
  }

  async update(id: string, updateAreaDto: UpdateAreaDto) {
    return await this.prisma.area.update({
      where: {
        id
      },
      data: updateAreaDto
    });
  }

  remove(id: string) {
    return this.prisma.area.update({
      where: {
        id
      },
      data: {
        deletedAt: new Date()
      }
    });
  }
}

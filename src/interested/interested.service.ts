import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateInterestedDto } from './dto/create-interested.dto';
import { UpdateInterestedDto } from './dto/update-interested.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaginationDto, MetaDtoPagination } from 'src/common';
import { Interested } from '@prisma/client';

@Injectable()
export class InterestedService {
  constructor(
    private readonly prismaService: PrismaService,
  ) { }

  async create(createInterestedDto: CreateInterestedDto) {

    const data = await this.prismaService.interested.create({
      data: {
        ...createInterestedDto,
      },
    });
    return data;
  }

  async findAll(paginationDto: PaginationDto): Promise<{ meta: MetaDtoPagination, data: CreateInterestedDto[] }> {
    const { page, limit } = paginationDto;
    const skip = (page - 1) * limit;
    const take = limit || 10;

    const total = await this.prismaService.interested.count({
      where: { deletedAt: null },
    });

    if (!limit) {
      const interested = await this.prismaService.interested.findMany({
        where: { deletedAt: null },
      });
      return {
        meta: {
          total,
          lastPage: 1,
          page,
        },
        data: interested,
      };
    }

    const lastPage = Math.ceil(total / limit);

    const interested = await this.prismaService.interested.findMany({
      where: { deletedAt: null },
      take,
      skip,
    });

    return {
      meta: {
        total,
        lastPage,
        page,
      },
      data: interested,
    }
  }

  async findOne(id: string) {
    const interested = await this.prismaService.interested.findUnique({
      where: { id },
    });
    return interested;
  }

  async update(id: string, updateInterestedDto: UpdateInterestedDto) {
    const data = await this.prismaService.interested.update({
      where: { id },
      data: {
        ...updateInterestedDto,
      },
    });
    return data;
  }

  async remove(id: string): Promise<Interested> {
    const interested = await this.prismaService.interested.findUnique({ where: { id } });
    if (!interested) { throw new NotFoundException(`Interested with id ${id} not found`); }
    const deleted = await this.prismaService.interested.delete(
      {
        where: { id },
      }
    )
    console.log('Delete interested')
    return deleted
  }

  async deleteOldInterested() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const deletedOld = await this.prismaService.interested.deleteMany({
      where: {
        createdAt: {
          lte: cutoff,    
        },
      },
    });
    return deletedOld
  }


}

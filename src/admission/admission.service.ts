import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { UpdateAdmissionDto } from './dto/update-admission.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Admission } from '@prisma/client';

@Injectable()
export class AdmissionService {

  constructor(private prismaService: PrismaService) { }

  async create(createAdmissionDto: CreateAdmissionDto): Promise<Admission> {
    if (createAdmissionDto.name === null || createAdmissionDto.name === undefined || createAdmissionDto.name === '') {
      throw new BadRequestException('No se ha ingresado un nombre');
    }

    const admission = await this.prismaService.admission.findUnique({
      where: {
        name: createAdmissionDto.name,
        deletedAt: null
      }
    });
    if (admission) {
      throw new ConflictException('Ya existe una admisión con ese nombre');
    }

    const newAdmission = await this.prismaService.admission.create({ data: createAdmissionDto });
    return newAdmission;
  }

  async findAll(): Promise<Admission[]> {
    const findAdmission = await this.prismaService.admission.findMany({
      where: {
        deletedAt: null
      },
    });
    return findAdmission;
  }

  async findOne(id: string): Promise<Admission> {
    const findAdmission = await this.prismaService.admission.findUnique({
      where: {
        id,
        deletedAt: null
      },
    });
    return findAdmission;
  }

  async update(id: string, updateAdmissionDto: UpdateAdmissionDto): Promise<Admission> {
    const admission = await this.findOne(id);
    if (!admission) {
      throw new NotFoundException(`No se encontró la admisión #${id}`);
    }
    return await this.prismaService.admission.update({
      where: { id },
      data: updateAdmissionDto,
    });
  }

  async remove(id: string): Promise<Admission> {
    return await this.prismaService.admission.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

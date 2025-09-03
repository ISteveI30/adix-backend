import { Injectable, NotFoundException } from '@nestjs/common';
import { StudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaginationDto } from 'src/common';

@Injectable()
export class StudentService {

  constructor(
    private prismaService: PrismaService
  ) { }

  async create(createStudentDto: StudentDto) {
    if (createStudentDto.birthday) {
      const birthday = new Date(createStudentDto.birthday);
      createStudentDto.birthday = birthday;
    }
    return await this.prismaService.student.create(
      {
        data: { ...createStudentDto }
      });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;

    const total = await this.prismaService.student.count({
      where: { deletedAt: null }
    });

    if (!limit) {
      const students = await this.prismaService.student.findMany({
        where: { deletedAt: null },
        include: { tutor: true, enrollments: true, accountReceivable: true }
      })
      return {
        meta: {
          total,
          lastPage: 1,
          page,
        },
        data: students
      };
    }

    const lastPage = Math.ceil(total / limit);

    const students = await this.prismaService.student.findMany({
      where: { deletedAt: null },
      include: { tutor: true, enrollments: true, accountReceivable: true },
      take: limit,
      skip: (page - 1) * limit,
    });

    if (students.length === 0) {
      return {
        meta: {
          total: 0,
          lastPage: 0,
          page: 0,
        },
        data: [],
      };
    }

    return {
      meta: {
        total,
        lastPage,
        page,
      },
      data: students
    };
  }

  async findOne(id: string) {
    return await this.prismaService.student.findUnique(
      {
        where: { id: id },
        include: { tutor: true, enrollments: true, accountReceivable: true }
      });
  }




  async update(id: string, updateStudentDto: UpdateStudentDto) {
    return await this.prismaService.student.update(
      {
        where: { id: id },
        data: updateStudentDto
      });
  }

  // //Eliminar un estudiante, si no tiene una matrícula activa
  async remove(id: string): Promise<{ message: string, state: boolean }> {
    let message = ""
    let state = false
    if (!id) {
      throw new NotFoundException('El id es requerido');
    }
    const student = await this.prismaService.student.findUnique({
      where: { id: id },
      include: { enrollments: true }
    });

    if (!student) {
      message = `El estudiante con id ${id} no existe`;
      state = false;
    } else if (student.enrollments.length > 0) {
      message = `El estudiante ${student.firstName} ${student.lastName} tiene una matrícula activa`;
      state = false;
    } else {
      await this.prismaService.student.update({
        where: { id: id },
        data: { deletedAt: new Date() }
      })
      message = `El estudiante ${student.firstName} ${student.lastName} ha sido eliminado`;
      state = true;
    }
    return {
      message,
      state
    }
  }

  async findStudentByName(query: string) {
    const result = await this.prismaService.student.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { tutorId: { contains: query, mode: 'insensitive' } },
        ],
        deletedAt: null
      },
      include: {
        tutor: true,
        enrollments: true,
        accountReceivable: true,
      },
    });

    return result;
  }

  async findByDni(dni: string) {
    return this.prismaService.student.findUnique({
      where: { dni },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        enrollments: {
          orderBy: { startDate: 'desc' },
          take: 1,
          select: {
            cycle: { select: { name: true } },
            admission: { select: { name: true } }
          }
        }
      }
    });
  }

  async findByNameForAttendance(query: string) {
    const q = (query ?? '').trim();
    if (!q) return [];

    const lastAdm = await this.prismaService.admission.findFirst({
      where: { deletedAt: null },
      orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true },
    });
    const lastAdmissionId = lastAdm?.id;

    return this.prismaService.student.findMany({
      where: {
        deletedAt: null,
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName:  { contains: q, mode: 'insensitive' } },
        ],
        enrollments: {
          some: {
            deletedAt: null,
            ...(lastAdmissionId ? { admissionId: lastAdmissionId } : {}),
          }
        }
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true, dni: true, firstName: true, lastName: true,
        enrollments: {
          orderBy: { startDate: 'desc' }, take: 1,
          select: { cycle: { select: { name: true } }, admission: { select: { name: true } } }
        }
      },
    });

    
  }





}

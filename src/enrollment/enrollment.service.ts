import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Enrollment, PaymentStatus, PaymentMethod, Modality } from '@prisma/client';
import { AccountReceivableService } from 'src/account-receivable/account-receivable.service';
import { PaymentService } from 'src/payment/payment.service';
import { PaginationDto } from 'src/common';

type CompatibleUpdateEnrollmentDto = Omit<UpdateEnrollmentDto, 'student' | 'tutor'>;

export type ActivesFilters = { cycleId?: string; careerId?: string; modality?: Modality };

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly accountReceivableService: AccountReceivableService,
    private readonly paymentService: PaymentService,
  ) {}

  async create(
    createEnrollmentDto: CreateEnrollmentDto,
  ): Promise<{ message: string; enrollment: Enrollment }> {
    try {
      return await this.prismaService.$transaction(async (tx: Prisma.TransactionClient) => {

        const enrollment = await this.validateAndCreateEnrollment(tx, createEnrollmentDto);

        const fullEnrollment = await tx.enrollment.findUnique({
          where: { id: enrollment.id },
          include: {
            student: { select: { firstName: true, lastName: true } },
            career: { select: { area: { select: { name: true } } } },
            admission: { select: { name: true } },
          },
        });

        if (!fullEnrollment) {
          throw new NotFoundException('Enrollment not found after creation');
        }

        const codeStudent = await this.generateCodeStudent(tx, fullEnrollment);

        await this.createAccountReceivable(createEnrollmentDto, enrollment, codeStudent);

        await this.updateEnrollmentWithStudentCode(tx, enrollment.id, codeStudent);

        return this.buildSuccessResponse(enrollment, codeStudent);
      });
    } catch (error: any) {
      this.handleCreationError(error);
    }
  }

  private async updateEnrollmentWithStudentCode(
    tx: Prisma.TransactionClient,
    enrollmentId: string,
    codeStudent: string,
  ): Promise<void> {
    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { codeStudent },
    });
  }

  private buildSuccessResponse(
    enrollment: Enrollment,
    codeStudent: string,
  ): { message: string; enrollment: Enrollment } {
    return {
      message: 'Matrícula creada exitosamente',
      enrollment: { ...enrollment, codeStudent },
    };
  }

  private handleCreationError(error: any): never {
    if (error instanceof NotFoundException) throw error;
    if (error instanceof BadRequestException) throw error;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException('El código de estudiante ya existe');
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new BadRequestException('Error de validación en la creación de matrícula');
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      throw new InternalServerErrorException('Error de inicialización de Prisma');
    }

    if (error instanceof Prisma.PrismaClientRustPanicError) {
      throw new InternalServerErrorException('Error interno de Prisma');
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      throw new InternalServerErrorException('Error desconocido de Prisma');
    }

    this.logger.error('Error creating enrollment', error?.stack);
    throw new InternalServerErrorException('Failed to create enrollment');
  }

  private async createAccountReceivable(
    dto: CreateEnrollmentDto,
    enrollment: Enrollment,
    studentCode: string,
  ) {
    const carnetCost = Number(dto.carnetCost || 0);
    const tuitionTotal = Number(dto.totalCost) - Number(dto.discounts || 0);
    const initialPayment = Number(dto.initialPayment || 0);

    const numberOfInstallments = dto.credit ? (dto.numInstallments || 1) : 1;

    if (carnetCost > 0) {
      const carnetAccount = await this.accountReceivableService.create({
        studentId: enrollment.studentId,
        totalAmount: carnetCost,
        pendingBalance: carnetCost,
        status: PaymentStatus.PENDIENTE,
        concept: `Pago de Carnet - ${studentCode}`,
        dueDate: this.getNextDueDate(0),
      });

      if (dto.paymentCarnet === true) {
        await this.paymentService.create({
          accountReceivableId: carnetAccount.id,
          invoiceNumber: `INV-${carnetAccount.id}-CARNET`,
          dueDate: carnetAccount.dueDate.toISOString(),
          amountPaid: carnetCost,
          paymentMethod: PaymentMethod.EFECTIVO,
          status: PaymentStatus.PAGADO,
          notes: `Pago de carnet realizado - ${studentCode}`,
          paymentDate: new Date().toISOString(),
        });
      }
    }

    if (tuitionTotal <= 0) {

      return;
    }

    const base = Number((tuitionTotal / numberOfInstallments).toFixed(2));
    let acum = 0;

    const installments: { id: string; dueDate: Date }[] = [];

    for (let i = 0; i < numberOfInstallments; i++) {
      const isLast = i === numberOfInstallments - 1;
      const amount = isLast ? Number((tuitionTotal - acum).toFixed(2)) : base;
      if (!isLast) acum += base;

      const dueDate = this.getNextDueDate(i);

      const ar = await this.accountReceivableService.create({
        studentId: enrollment.studentId,
        totalAmount: amount,
        pendingBalance: amount,
        status: PaymentStatus.PENDIENTE,
        concept: `Matrícula - Cuota ${i + 1} - ${studentCode}`,
        dueDate,
      });

      installments.push({ id: ar.id, dueDate });
    }

    if (initialPayment > 0) {
      await this.paymentService.create({
        accountReceivableId: installments[0].id,
        invoiceNumber: `INV-${installments[0].id}-INIT`,
        dueDate: new Date().toISOString(),
        amountPaid: initialPayment,
        paymentMethod: PaymentMethod.EFECTIVO,
        status: PaymentStatus.PAGADO,
        notes: `Pago inicial - ${studentCode}`,
        paymentDate: new Date().toISOString(),
      });
    }
  }

  private getNextDueDate(index: number = 0): Date {
    const today = new Date();
    const nextDueDate = new Date(today.setMonth(today.getMonth() + index));
    nextDueDate.setDate(30);
    return nextDueDate;
  }

  private async validateAndCreateEnrollment(
    tx: Prisma.TransactionClient,
    dto: CreateEnrollmentDto,
  ): Promise<Enrollment> {
    const { studentId, cycleId, careerId, admissionId } = dto;

    const activeEnrollment = await tx.enrollment.findFirst({
      where: { studentId, cycleId, careerId, admissionId, deletedAt: null },
      include: { student: true, cycle: true, career: true, admission: true },
    });

    if (activeEnrollment) {
      throw new BadRequestException(
        `El estudiante ya tiene una matrícula activa en el ciclo ${activeEnrollment.cycle.name}, carrera ${activeEnrollment.career.name}, admisión ${activeEnrollment.admission.name}`,
      );
    }

    return tx.enrollment.create({
      data: {
        startDate: dto.startDate,
        endDate: dto.endDate,
        modality: dto.modality,
        shift: dto.shift,
        credit: dto.credit,
        numInstallments: dto.numInstallments,
        paymentCarnet: dto.paymentCarnet,
        carnetCost: dto.carnetCost,
        totalCost: dto.totalCost,
        initialPayment: dto.initialPayment,
        discounts: dto.discounts,
        notes: dto.notes,
        student: { connect: { id: studentId } },
        cycle: { connect: { id: dto.cycleId } },
        admission: { connect: { id: dto.admissionId } },
        career: { connect: { id: dto.careerId } },
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        cycle: true,
        career: { select: { name: true, area: { select: { name: true } } } },
        admission: { select: { name: true } },
      },
    });
  }

  private async generateCodeStudent(
    tx: Prisma.TransactionClient,
    enrollment: Enrollment & {
      student: { firstName: string; lastName: string };
      career: { area: { name: string } };
      admission: { name: string };
    },
  ): Promise<string> {
    const { student, career, admission } = enrollment;

    const { firstName, lastName } = student;
    const { area } = career;
    const { name: admissionName } = admission;

    if (!firstName || !lastName || !area?.name || !admissionName) {
      throw new Error('Faltan propiedades necesarias para generar el código de estudiante');
    }

    const nameInitials = `${firstName.slice(0, 2).toUpperCase()}${lastName
      .slice(0, 2)
      .toUpperCase()}`;

    const codeBase = `${admissionName}-${area.name}-${nameInitials}`.replace(/\s+/g, '-');

    let counter = 1;
    let finalCode: string;

    do {
      finalCode = `${codeBase}-${String(counter).padStart(3, '0')}`;
      counter++;
    } while (await tx.enrollment.findUnique({ where: { codeStudent: finalCode } }));

    return finalCode;
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit, page } = paginationDto;

    const totalPage = await this.prismaService.enrollment.count({
      where: { deletedAt: null },
    });

    if (!limit) {
      const enrollment = await this.prismaService.enrollment.findMany({
        where: { deletedAt: null },
        include: { student: true, cycle: true, career: { include: { area: true } }, admission: true },
      });

      return {
        meta: { total: totalPage, lastPage: 1, page },
        data: enrollment,
      };
    }

    const lastPage = Math.ceil(totalPage / limit);

    const enrollment = await this.prismaService.enrollment.findMany({
      where: { deletedAt: null },
      include: { student: true, cycle: true, career: { include: { area: true } }, admission: true },
      take: limit,
      skip: (page - 1) * limit,
    });

    if (enrollment.length <= 0) {
      return {
        meta: { total: 0, lastPage: 0, page: 0 },
        data: [],
      };
    }

    return {
      meta: { total: totalPage, lastPage, page },
      data: enrollment,
    };
  }

  async findOne(id: string): Promise<Enrollment> {
    return this.prismaService.enrollment.findUnique({
      where: { id, deletedAt: null },
      include: { student: true, cycle: true, career: true, admission: true },
    });
  }

  async update(id: string, updateEnrollmentDto: CompatibleUpdateEnrollmentDto): Promise<Enrollment> {
    return this.prismaService.enrollment.update({ where: { id }, data: updateEnrollmentDto });
  }

  async remove(id: string): Promise<Enrollment> {
    const enrollment = await this.prismaService.enrollment.findUnique({ where: { id } });

    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.deletedAt) throw new BadRequestException('Enrollment already deleted');

    const hasActiveReceivables = await this.prismaService.accountReceivable.findMany({
      where: { concept: { contains: enrollment.codeStudent } },
    });

    if (hasActiveReceivables.length > 0) {
      const receivableIds = hasActiveReceivables.map((r) => r.id);

      const hasPayments = await this.prismaService.payment.findMany({
        where: { accountReceivableId: { in: receivableIds } },
      });

      for (const accountReceivable of hasActiveReceivables) {
        await this.prismaService.accountReceivable.update({
          where: { id: accountReceivable.id },
          data: { status: PaymentStatus.ANULADO },
        });
      }

      for (const payment of hasPayments) {
        await this.prismaService.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.ANULADO },
        });
      }
    }

    return await this.prismaService.enrollment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findActives(filters: { cycleId?: string; careerId?: string; modality?: Modality }) {
    const where: any = { deletedAt: null };
    if (filters.cycleId) where.cycleId = filters.cycleId;
    if (filters.careerId) where.careerId = filters.careerId;
    if (filters.modality) where.modality = filters.modality;

    return this.prismaService.enrollment.findMany({
      where,
      include: { student: true, career: true },
    });
  }
}

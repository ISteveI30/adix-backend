import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Enrollment, PaymentStatus, PaymentMethod } from '@prisma/client';
import { AccountReceivableService } from 'src/account-receivable/account-receivable.service';
import { PaymentService } from 'src/payment/payment.service';
import { PaginationDto } from 'src/common';
import { Modality /*, EnrollmentStatus*/ } from '@prisma/client';

type CompatibleUpdateEnrollmentDto = Omit<UpdateEnrollmentDto, 'student' | 'tutor'>;

export type ActivesFilters = { cycleId?: string; careerId?: string; modality?: Modality };

@Injectable()
export class EnrollmentService {

  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly accountReceivableService: AccountReceivableService,
    private readonly paymentService: PaymentService,
  ) { }

  async create(
    createEnrollmentDto: CreateEnrollmentDto
  ): Promise<{ message: string; enrollment: Enrollment }> {
    try {
      return await this.prismaService.$transaction(async (tx: Prisma.TransactionClient) => {
        // Paso 1: Validar y crear la matrícula
        const enrollment = await this.validateAndCreateEnrollment(tx, createEnrollmentDto);
        // console.log('Matrícula creada:', enrollment);

        // Paso 2: Obtener datos completos de la matrícula
        const fullEnrollment = await tx.enrollment.findUnique({
          where: { id: enrollment.id },
          include: {
            student: { select: { firstName: true, lastName: true } },
            career: { select: { area: { select: { name: true } } } },
            admission: { select: { name: true } },
          },
        });

        // console.log('Matrícula completa:', fullEnrollment);

        if (!fullEnrollment) {
          throw new NotFoundException('Enrollment not found after creation');
        }

        // Paso 3: Generar código de estudiante
        const codeStudent = await this.generateCodeStudent(tx, fullEnrollment);

        // Paso 4: Crear cuentas por cobrar (cuotas)
        await this.createAccountReceivable(createEnrollmentDto, enrollment, codeStudent);

        // Paso 5: Actualizar matrícula con código de estudiante
        await this.updateEnrollmentWithStudentCode(tx, enrollment.id, codeStudent);

        // Retornar resultado
        return this.buildSuccessResponse(enrollment, codeStudent);
      });
    } catch (error) {
      this.handleCreationError(error);
    }
  }

  // Métodos auxiliares privados para mejor organización

  private async updateEnrollmentWithStudentCode(
    tx: Prisma.TransactionClient,
    enrollmentId: string,
    codeStudent: string
  ): Promise<void> {
    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { codeStudent }
    });
  }

  private buildSuccessResponse(
    enrollment: Enrollment,
    codeStudent: string
  ): { message: string; enrollment: Enrollment } {
    return {
      message: 'Matrícula creada exitosamente',
      enrollment: { ...enrollment, codeStudent }
    };
  }

  private handleCreationError(error: Error): never {
    if (error instanceof NotFoundException) {
      throw error;
    }
    if (error instanceof BadRequestException) {
      throw error;
    }
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

    this.logger.error('Error creating enrollment', error.stack);
    throw new InternalServerErrorException('Failed to create enrollment');
  }

  private async createAccountReceivable(
    dto: CreateEnrollmentDto,
    enrollment: Enrollment,
    studentCode: string
  ) {
    const totalAmount = dto.totalCost - (dto.discounts || 0) - (dto.initialPayment || 0);
    const numberOfInstallments = dto.credit ? dto.numInstallments || 4 : 1;
    const amountPerInstallment = totalAmount / numberOfInstallments;
    // Crear cuenta por cobrar para carnet si no ha sido pagado
    if (!dto.paymentCarnet) {
      const carnetAccount = await this.accountReceivableService.create({
        studentId: enrollment.studentId,
        totalAmount: dto.carnetCost || 0,
        pendingBalance: dto.carnetCost || 0,
        concept: `Pago de Carnet - ${studentCode}`,
        dueDate: this.getNextDueDate(0),
      });

      await this.paymentService.create({
        accountReceivableId: carnetAccount.id,
        invoiceNumber: `INV-${carnetAccount.id}`,
        dueDate: this.getNextDueDate(0).toISOString(),
        amountPaid: 0,
        paymentMethod: PaymentMethod.EFECTIVO,
        status: PaymentStatus.PENDIENTE,
        notes: `Pago de carnet pendiente - ${studentCode}`,
        paymentDate: new Date().toISOString(),
      });
    } else {
      // Si ya pagó el carnet, registrar el pago automáticamente como PAGADO
      const carnetAccount = await this.accountReceivableService.create({
        studentId: enrollment.studentId,
        totalAmount: dto.carnetCost || 0,
        pendingBalance: 0,
        concept: `Pago de Carnet - ${studentCode}`,
        dueDate: this.getNextDueDate(0),
      });

      await this.paymentService.create({
        accountReceivableId: carnetAccount.id,
        invoiceNumber: `INV-${carnetAccount.id}`,
        dueDate: this.getNextDueDate(0).toISOString(),
        amountPaid: dto.carnetCost || 0,
        paymentMethod: PaymentMethod.EFECTIVO,
        status: PaymentStatus.PAGADO,
        notes: `Pago de carnet realizado - ${studentCode}`,
        paymentDate: new Date().toISOString(),
      });
    }

    let quote = 0

    if (dto.initialPayment >= amountPerInstallment) {
      quote = 1
      const initialAccount = await this.accountReceivableService.create({
        studentId: enrollment.studentId,
        totalAmount: amountPerInstallment,
        pendingBalance: amountPerInstallment,
        status: PaymentStatus.PAGADO,
        concept: `Matrícula - Cuota 1 - ${studentCode}`,
        dueDate: new Date(),
      });


      await this.paymentService.create({
        accountReceivableId: initialAccount.id,
        invoiceNumber: `INV-${initialAccount.id}-0`,
        dueDate: new Date().toISOString(),
        amountPaid: dto.initialPayment,
        paymentMethod: PaymentMethod.EFECTIVO,
        status: PaymentStatus.PAGADO,
        notes: `Pago correspondiente a cuota 1 - ${studentCode}`,
        paymentDate: new Date().toISOString(),
      });

    }

    // Crear cuentas por cobrar mensuales según número de cuotas
    for (quote; quote < numberOfInstallments; quote++) {
      const dueDate = this.getNextDueDate(quote);
      await this.accountReceivableService.create({
        studentId: enrollment.studentId,
        totalAmount: amountPerInstallment,
        pendingBalance: amountPerInstallment,
        concept: `Matrícula - Cuota ${quote + 1} - ${studentCode}`,
        dueDate,
      });
    }
  }

  private getNextDueDate(index: number = 0): Date {
    const today = new Date();
    const nextDueDate = new Date(today.setMonth(today.getMonth() + index)); // Incrementamos el mes para la próxima cuota
    nextDueDate.setDate(30); // Se fija el día 30 de cada mes
    return nextDueDate;
  }

  private async validateAndCreateEnrollment(
    tx: Prisma.TransactionClient,
    dto: CreateEnrollmentDto
  ): Promise<Enrollment> {
    const { studentId, cycleId, careerId, admissionId } = dto;


    const activeEnrollment = await tx.enrollment.findFirst({
      where: { studentId, cycleId, careerId, admissionId, deletedAt: null },
      include: { student: true, cycle: true, career: true, admission: true },
    });

    if (activeEnrollment) {
      throw new BadRequestException(
        `El estudiante ya tiene una matrícula activa en el ciclo ${activeEnrollment.cycle.name}, carrera ${activeEnrollment.career.name}, admisión ${activeEnrollment.admission.name}`
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
    }
  ): Promise<string> {
    const { student, career, admission } = enrollment;

    // Validar que todas las propiedades necesarias están presentes
    const { firstName, lastName } = student;
    const { area } = career;
    const { name: admissionName } = admission;

    if (!firstName || !lastName || !area || !area.name || !admissionName) {
      throw new Error("Faltan propiedades necesarias para generar el código de estudiante");
    }

    // Generar las iniciales del nombre
    const nameInitials = `${firstName.slice(0, 2).toUpperCase()}${lastName.slice(0, 2).toUpperCase()}`;

    // Construir la base del código
    const codeBase = `${admissionName}-${area.name}-${nameInitials}`.replace(/\s+/g, '-');
    // const codeBase = `${admissionName}-${area.name}`.replace(/\s+/g, '-');

    // Asegurarse de que el código generado sea único
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
    const totalPage = await this.prismaService.enrollment.count(
      {
        where: { deletedAt: null }
      }
    );

    if (!limit) {
      const enrollment = await this.prismaService.enrollment.findMany({
        where: { deletedAt: null },
        include: { student: true, cycle: true, career: { include: { area: true } }, admission: true }
      });
      return {
        meta: {
          total: totalPage,
          lastPage: 1,
          page
        },
        data: enrollment
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
        meta: {
          total: 0,
          lastPage: 0,
          page: 0
        },
        data: []
      };
    }
    return {
      meta: {
        total: totalPage,
        lastPage,
        page
      },
      data: enrollment
    };
  }

  async findOne(id: string): Promise<Enrollment> {
    const enrollment = await this.prismaService.enrollment.findUnique({
      where: { id, deletedAt: null },
      include: { student: true, cycle: true, career: true, admission: true },
    });
    return enrollment;
  }

  async update(id: string, updateEnrollmentDto: CompatibleUpdateEnrollmentDto): Promise<Enrollment> {
    return this.prismaService.enrollment.update({ where: { id }, data: updateEnrollmentDto });
  }

  async remove(id: string): Promise<Enrollment> {

    const enrollment = await this.prismaService.enrollment.findUnique({ where: { id } });

    if (!enrollment) throw new NotFoundException('Enrollment not found');

    if (enrollment.deletedAt) throw new BadRequestException('Enrollment already deleted');

    const hasActiveReceivables = await this.prismaService.accountReceivable.findMany({
      where: {
        concept: { contains: enrollment.codeStudent },
      },
    });

    if (hasActiveReceivables) {
      const hasPayments = await this.prismaService.payment.findMany({
        where: {
          accountReceivableId: hasActiveReceivables[0].id,
        },
      });

      while (hasActiveReceivables.length > 0) {
        const accountReceivable = hasActiveReceivables.pop();
        if (accountReceivable) {
          await this.prismaService.accountReceivable.update({
            where: { id: accountReceivable.id },
            data: { status: PaymentStatus.ANULADO },
          });
        }
      }

      if (hasPayments) {
        while (hasPayments.length > 0) {
          const payment = hasPayments.pop();
          if (payment) {
            await this.prismaService.payment.update({
              where: { id: payment.id },
              data: { status: PaymentStatus.ANULADO },
            });
          }
        }
      }
    }

    // Si no hay cuentas por cobrar activas ni pagos, eliminar la matrícula
    return await this.prismaService.enrollment.update({ where: { id }, data: { deletedAt: new Date() } });
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
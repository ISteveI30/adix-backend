import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAccountReceivableDto } from './dto/create-account-receivable.dto';
import { UpdateAccountReceivableDto } from './dto/update-account-receivable.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccountReceivable, PaymentStatus } from '@prisma/client';

@Injectable()
export class AccountReceivableService {
  constructor(private prismaService: PrismaService) {}

  async create(dto: CreateAccountReceivableDto): Promise<AccountReceivable> {
    const total = Number(dto.totalAmount);
    const pending =
      dto.pendingBalance !== undefined ? Number(dto.pendingBalance) : total;

    if (Number.isNaN(total) || total < 0) {
      throw new BadRequestException('El monto total no puede ser negativo');
    }
    if (Number.isNaN(pending) || pending < 0) {
      throw new BadRequestException('El saldo pendiente no puede ser negativo');
    }
    if (pending > total) {
      throw new BadRequestException('El saldo pendiente no puede ser mayor al total');
    }

    const status = dto.status ?? PaymentStatus.PENDIENTE;

    return await this.prismaService.accountReceivable.create({
      data: {
        studentId: dto.studentId,
        paymentDate: new Date(), // Fecha de creación
        totalAmount: dto.totalAmount as any,
        pendingBalance: pending as any,
        status,
        concept: dto.concept,
        dueDate: dto.dueDate,
      },
    });
  }

  async findAll(): Promise<AccountReceivable[]> {
    return this.prismaService.accountReceivable.findMany({
      orderBy: { dueDate: 'desc' },
      include: { student: true, payments: true },
    });
  }

  async findOne(id: string): Promise<AccountReceivable> {
    const account = await this.prismaService.accountReceivable.findUnique({
      where: { id },
      include: { student: true, payments: true },
    });

    if (!account) {
      throw new NotFoundException(`Cuenta por cobrar con ID ${id} no encontrada`);
    }
    return account;
  }

  async findByCodeStudent(codeStudent: string): Promise<AccountReceivable[]> {
    return this.prismaService.accountReceivable.findMany({
      where: { concept: { contains: codeStudent } },
      orderBy: { dueDate: 'asc' },
      include: { student: true, payments: true },
    });
  }

  async findByStudentId(id: string): Promise<AccountReceivable[]> {
    const account = await this.prismaService.accountReceivable.findMany({
      where: { studentId: id },
      orderBy: { dueDate: 'desc' },
      include: { student: true, payments: true },
    });

    // findMany devuelve [] si no hay
    if (!account) {
      throw new NotFoundException(
        `Cuenta por cobrar del Estudiante con ID ${id} no encontrada`,
      );
    }
    return account;
  }

  async update(id: string, dto: UpdateAccountReceivableDto): Promise<AccountReceivable> {
    const account = await this.findOne(id);

    if (dto.pendingBalance !== undefined && Number(dto.pendingBalance) < 0) {
      throw new BadRequestException('El saldo pendiente no puede ser negativo');
    }

    if (dto.totalAmount !== undefined && Number(dto.totalAmount) < Number(account.pendingBalance)) {
      throw new BadRequestException('El nuevo monto total no puede ser menor que el saldo pendiente');
    }

    return this.prismaService.accountReceivable.update({
      where: { id },
      data: { ...dto },
    });
  }

  remove(id: string): Promise<AccountReceivable> {
    return this.prismaService.accountReceivable.update({
      where: { id },
      data: { status: PaymentStatus.ANULADO },
    });
  }
}

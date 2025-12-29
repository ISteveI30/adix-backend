import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment, PaymentStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePaymentDto): Promise<Payment> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.accountReceivable.findUnique({
        where: { id: dto.accountReceivableId },
      });

      if (!account) {
        throw new NotFoundException(
          `Cuenta por cobrar con ID ${dto.accountReceivableId} no encontrada`,
        );
      }

      if (account.status === PaymentStatus.ANULADO) {
        throw new BadRequestException('No se puede pagar una cuenta ANULADA');
      }

      if (account.status === PaymentStatus.PAGADO || Number(account.pendingBalance) === 0) {
        throw new BadRequestException('La cuenta ya está PAGADA');
      }

      const amountPaid = Number(dto.amountPaid);
      if (amountPaid <= 0) {
        throw new BadRequestException('El monto pagado debe ser mayor a 0');
      }

      const pendingReceivables = await tx.accountReceivable.findMany({
        where: {
          studentId: account.studentId,
          status: PaymentStatus.PENDIENTE,
        },
        orderBy: { dueDate: 'asc' },
      });

      const totalDebt = pendingReceivables.reduce(
        (acc, r) => acc + Number(r.pendingBalance),
        0,
      );

      if (amountPaid > totalDebt) {
        throw new BadRequestException(
          `El monto pagado (${amountPaid}) excede la deuda pendiente total (${totalDebt}).`,
        );
      }

      const payment = await tx.payment.create({
        data: {
          ...dto,
          status: PaymentStatus.PAGADO,
        },
      });

      let remaining = amountPaid;

      const ordered = [
        account,
        ...pendingReceivables.filter((r) => r.id !== account.id),
      ];

      for (const ar of ordered) {
        if (remaining <= 0) break;

        const pend = Number(ar.pendingBalance);
        if (pend <= 0) continue;

        const payNow = Math.min(remaining, pend);
        const newPend = pend - payNow;
        remaining -= payNow;

        await tx.accountReceivable.update({
          where: { id: ar.id },
          data: {
            pendingBalance: newPend,
            status: newPend === 0 ? PaymentStatus.PAGADO : PaymentStatus.PENDIENTE,
          },
        });
      }

      return payment;
    });
  }

  async findAll(): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      orderBy: { paymentDate: 'desc' },
      include: { accountReceivable: true },
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { accountReceivable: true },
    });

    if (!payment) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }
    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({ where: { id } });

    if (!payment) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }

    return this.prisma.payment.update({
      where: { id },
      data: { ...dto },
    });
  }

  async findPaymentsByStudent(studentId: string): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: { accountReceivable: { studentId } },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async findPaymentsByAccount(accountId: string): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: { accountReceivableId: accountId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async cancelPayment(id: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }

    if (payment.status === PaymentStatus.ANULADO) {
      throw new BadRequestException('El pago ya está ANULADO');
    }

    const account = await this.prisma.accountReceivable.findUnique({
      where: { id: payment.accountReceivableId },
    });

    if (!account) {
      throw new NotFoundException(
        `Cuenta por cobrar con ID ${payment.accountReceivableId} no encontrada`,
      );
    }

    const newPendingBalance = Number(account.pendingBalance) + Number(payment.amountPaid);

    await this.prisma.accountReceivable.update({
      where: { id: payment.accountReceivableId },
      data: {
        pendingBalance: newPendingBalance,
        status: newPendingBalance === 0 ? PaymentStatus.PAGADO : PaymentStatus.PENDIENTE,
      },
    });

    await this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.ANULADO },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.ANULADO },
    });
  }
}

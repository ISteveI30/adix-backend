import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment, PaymentStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePaymentDto): Promise<Payment> {
    const account = await this.prisma.accountReceivable.findUnique({
      where: { id: dto.accountReceivableId },
    });

    if (!account) {
      throw new NotFoundException(`Cuenta por cobrar con ID ${dto.accountReceivableId} no encontrada`);
    }

    if (dto.amountPaid > Number(account.pendingBalance)) {
      throw new BadRequestException('El monto pagado no puede ser mayor al saldo pendiente');
    }

    const payment = await this.prisma.payment.create({
      data: { ...dto },
    });

    // Actualizar el saldo pendiente de la cuenta por cobrar
    const newPendingBalance = Number(account.pendingBalance) - dto.amountPaid;
    await this.prisma.accountReceivable.update({
      where: { id: dto.accountReceivableId },
      data: {
        pendingBalance: newPendingBalance,
        status: newPendingBalance === 0 ? PaymentStatus.PAGADO : PaymentStatus.PENDIENTE,
      },
    });

    return payment;
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
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: { ...dto },
    });

    return updatedPayment;
  }

  async findPaymentsByStudent(studentId: string): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: { accountReceivable: { studentId } },
      orderBy: { paymentDate: 'desc' }
    });
  }

  async findPaymentsByAccount(accountId: string): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: { accountReceivableId: accountId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async cancelPayment(id: string): Promise<void> {

    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id },
      });
      if (!payment) {
        throw new NotFoundException(`Pago con ID ${id} no encontrado`);
      }
      const account = await this.prisma.accountReceivable.findUnique({
        where: { id: payment.accountReceivableId },
      });
      if (!account) {
        throw new NotFoundException(`Cuenta por cobrar con ID ${payment.accountReceivableId} no encontrada`);
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

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new BadRequestException('Error al cancelar el pago');
      }
    }
  }

  async remove(id: string): Promise<void> {
    await this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.ANULADO },
    })
  }
}

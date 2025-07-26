import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment, PaymentStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) { }

  /*async create(dto: CreatePaymentDto): Promise<Payment> {
    const account = await this.prisma.accountReceivable.findUnique({
      where: { id: dto.accountReceivableId },
    });

    if (!account) {
      throw new NotFoundException(`Cuenta por cobrar con ID ${dto.accountReceivableId} no encontrada`);
    }

    if (dto.amountPaid > Number(account.pendingBalance)) {
      throw new BadRequestException('El monto pagado no puede ser mayor al saldo pendiente');
    }

    if (dto.amountPaid <= 0) {
      throw new BadRequestException('El monto pagado no puede menor a cero');
    }

    const payment = await this.prisma.payment.create({
      data: { ...dto },
    });

    
    
    if (dto.amountPaid < Number(account.pendingBalance)){
      const newPendingBalance = Number(account.pendingBalance) - dto.amountPaid;
      await this.prisma.accountReceivable.update({
        where: { id: dto.accountReceivableId },
        data: {
          pendingBalance: newPendingBalance,
          status: newPendingBalance === 0 ? PaymentStatus.PAGADO : PaymentStatus.PENDIENTE,
        },
      });
    } else {
      
    }



    return payment;
  }*/


  async create(dto: CreatePaymentDto): Promise<Payment> {
    const account = await this.prisma.accountReceivable.findUnique({
      where: { id: dto.accountReceivableId },
    });

    if (!account) {
      throw new NotFoundException(`Cuenta por cobrar con ID ${dto.accountReceivableId} no encontrada`);
    }

    if (dto.amountPaid <= 0) {
      throw new BadRequestException('El monto pagado no puede ser menor o igual a cero');
    }

    const payment = await this.prisma.payment.create({
      data: { ...dto },
    });

    const newPendingBalance = Number(account.pendingBalance) - dto.amountPaid;

    // Actualiza la boleta actual
    await this.prisma.accountReceivable.update({
      where: { id: dto.accountReceivableId },
      data: {
        pendingBalance: newPendingBalance > 0 ? newPendingBalance : 0,
        status: newPendingBalance <= 0 ? PaymentStatus.PAGADO : PaymentStatus.PENDIENTE,
      },
    });

    // Si el pago fue mayor al saldo actual
    if (newPendingBalance < 0) {
      const excedente = Math.abs(newPendingBalance);

      // Buscar las demás boletas pendientes del estudiante, excepto la actual
      const otrasCuotas = await this.prisma.accountReceivable.findMany({
        where: {
          studentId: account.studentId,
          status: PaymentStatus.PENDIENTE,
          NOT: { id: account.id },
        },
        orderBy: { dueDate: 'asc' },
      });

      let saldoRestante = excedente;

      for (const cuota of otrasCuotas) {
        const nuevoSaldo = Number(cuota.pendingBalance) - saldoRestante;

        if (nuevoSaldo <= 0) {
          // Marcar cuota como pagada
          await this.prisma.accountReceivable.update({
            where: { id: cuota.id },
            data: {
              pendingBalance: 0,
              status: PaymentStatus.PAGADO,
            },
          });
          saldoRestante = Math.abs(nuevoSaldo); // Puede sobrar más para otras cuotas
        } else {
          // Aún queda saldo en la cuota → restar y terminar
          await this.prisma.accountReceivable.update({
            where: { id: cuota.id },
            data: {
              pendingBalance: nuevoSaldo,
            },
          });
          saldoRestante = 0;
          break;
        }
      }
    }

    // Recalcular las cuotas restantes
    const cuotasPendientes = await this.prisma.accountReceivable.findMany({
      where: {
        studentId: account.studentId,
        status: PaymentStatus.PENDIENTE,
      },
      orderBy: { dueDate: 'asc' },
    });

    const deudaPendiente = cuotasPendientes.reduce((acc, c) => acc + Number(c.pendingBalance), 0);

    if (cuotasPendientes.length > 0) {
      const nuevoMonto = parseFloat((deudaPendiente / cuotasPendientes.length).toFixed(2));

      for (const cuota of cuotasPendientes) {
        await this.prisma.accountReceivable.update({
          where: { id: cuota.id },
          data: {
            totalAmount: nuevoMonto,
            pendingBalance: nuevoMonto,
          },
        });
      }
    }

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

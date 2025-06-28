import { PaymentStatus, PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const updateOverdueAccounts = async() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // fijar hora medianoche, apra comparar solo fechas

  await prisma.accountReceivable.updateMany({
    where: {
      dueDate: {
        lt: today,
      },
      status: PaymentStatus.PENDIENTE,
      NOT: { status: PaymentStatus.ANULADO },
    },
    data: {
      status: PaymentStatus.VENCIDO,
    },
  })

  await prisma.accountReceivable.updateMany({
    where: {
      pendingBalance: { lte: 0 },
      status: { in: [PaymentStatus.PENDIENTE, PaymentStatus.VENCIDO] },
      NOT: { status: PaymentStatus.ANULADO },
    },
    data: { status: PaymentStatus.PAGADO },
  })

  console.log("Cuentas por cobrar vencidas actualizadas")
  await prisma.$disconnect()
}

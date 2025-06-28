import { Module } from '@nestjs/common';
import { AccountReceivableService } from './account-receivable.service';
import { AccountReceivableController } from './account-receivable.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [AccountReceivableController],
  providers: [AccountReceivableService, PrismaService],
})
export class AccountReceivableModule {}

import { Module } from '@nestjs/common';
import { CycleService } from './cycle.service';
import { CycleController } from './cycle.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [CycleController],
  providers: [CycleService, PrismaService],
})
export class CycleModule {}

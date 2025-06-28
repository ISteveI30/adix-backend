import { Module } from '@nestjs/common';
import { AdmissionService } from './admission.service';
import { AdmissionController } from './admission.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [AdmissionController],
  providers: [AdmissionService, PrismaService],
})
export class AdmissionModule {}

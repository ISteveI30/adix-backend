import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExamDetailController } from './exam-detail.controller';
import { ExamDetailService } from './exam-detail.service';

@Module({
  controllers: [ExamDetailController],
  providers: [ExamDetailService, PrismaService],
})
export class ExamDetailModule {}
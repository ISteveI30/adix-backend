import { Module } from '@nestjs/common';
import { TutorService } from './tutor.service';
import { TutorController } from './tutor.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [TutorController],
  providers: [TutorService, PrismaService]
})
export class TutorModule {}

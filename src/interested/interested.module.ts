import { Module } from '@nestjs/common';
import { InterestedService } from './interested.service';
import { InterestedController } from './interested.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [InterestedController],
  providers: [InterestedService, PrismaService],
})
export class InterestedModule {}
 
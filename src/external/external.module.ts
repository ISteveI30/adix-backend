import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExternalService } from './external.service';
import { ExternalController } from './external.controller';

@Module({
  controllers: [ExternalController],
  providers: [ExternalService, PrismaService],
})
export class ExternalModule {}
 
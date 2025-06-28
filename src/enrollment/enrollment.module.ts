import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccountReceivableService } from 'src/account-receivable/account-receivable.service';
import { PaymentService } from 'src/payment/payment.service';
import { TutorService } from 'src/tutor/tutor.service';
import { StudentService } from 'src/student/student.service';

@Module({
  controllers: [EnrollmentController],
  providers: [
    EnrollmentService, 
    PrismaService, 
    AccountReceivableService, 
    PaymentService,
    TutorService,
    StudentService
  ]
})
export class EnrollmentModule {}

import { Body, Controller, Post, Get, Param } from "@nestjs/common";
import { CreateExamDetailDto } from "./dto/create-examdetail.dto";
import { ExamDetailService } from "./exam-detail.service";

@Controller('examdetail')
export class ExamDetailController {
  constructor(private readonly detailService: ExamDetailService) { }

  @Post()
  create(@Body() dto: CreateExamDetailDto) {
    return this.detailService.create(dto);
  }

  @Post('assign-students')
  async assignStudents(
    @Body() body: { examId: string; studentIds: string[] }
  ) {
    return this.detailService.assignStudents(body.examId, body.studentIds);
  }

  @Post('assign-interested')
  async assignInterested(
    @Body() body: { examId: string; interestedIds: string[] }  
  ) {
    return this.detailService.assignInterested(body.examId, body.interestedIds);
  }


  @Get(':examId')
  getByExam(@Param('examId') examId: string) {
    return this.detailService.getByExam(examId);
  }


  @Get('assignable/:examId')
  getAssignable(@Param('examId') examId: string) {
    return this.detailService.getAssignableStudents(examId);
  }
}
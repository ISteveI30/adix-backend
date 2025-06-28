import { Body, Controller, Post } from "@nestjs/common";
import { CreateExamDetailDto } from "./dto/create-examdetail.dto";
import { ExamDetailService } from "./exam-detail.service";

@Controller('examdetail')
export class ExamDetailController {
  constructor(private readonly detailService: ExamDetailService) { }

  @Post()
  create(@Body() dto: CreateExamDetailDto) {
    return this.detailService.create(dto);
  }
}
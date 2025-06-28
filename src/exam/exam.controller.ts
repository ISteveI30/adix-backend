import { Body, Controller, Post } from "@nestjs/common";
import { ExamService } from "./exam.service";
import { CreateExamDto } from "./dto/create-exam.dto";

@Controller('exam')
export class ExamController {
  constructor(private readonly examService: ExamService) { }

  @Post()
  create(@Body() dto: CreateExamDto) {
    return this.examService.create(dto);
  }
}
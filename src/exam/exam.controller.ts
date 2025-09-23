import { Body, Controller, Post, Get, Param, Patch, Put, Delete } from "@nestjs/common";
import { ExamService } from "./exam.service";
import { CreateExamDto } from "./dto/create-exam.dto";
import { CreateExamWithDetailsDto } from "./dto/create-exam-with-details.dto";
import { UpdateScoresDto } from "./dto/update-scores.dto";
import { SyncParticipantsDto } from "./dto/sync-participants.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";
import { SaveScoresDto } from './dto/save-scores.dto';
import { SavePaymentsDto } from './dto/save-payments.dto';

@Controller('exam')
export class ExamController {
  constructor(private readonly examService: ExamService) { }

  @Post()
  create(@Body() dto: CreateExamDto) {
    return this.examService.create(dto);
  }
  @Post("create-with-details") createWithDetails(@Body() dto: CreateExamWithDetailsDto) {
    return this.examService.createWithDetails(dto);
  }
  @Get('summary')
  getSummary() {
    return this.examService.summary();
  }

  @Get()
  findAll() {
    return this.examService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.examService.update(id, dto);
  }

  @Get(':id/roster') roster(@Param('id') id: string) { return this.examService.roster(id); }
  @Put(':id/participants') sync(@Param('id') id: string, @Body() dto: SyncParticipantsDto) {
    return this.examService.syncParticipants(id, dto);
  }
  @Post(':id/participants/add') add(@Param('id') id: string, @Body() dto: SyncParticipantsDto) {
    return this.examService.addParticipants(id, dto);
  }
  @Post(':id/participants/remove') remove(@Param('id') id: string, @Body() dto: SyncParticipantsDto) {
    return this.examService.removeParticipants(id, dto);
  }


  @Patch(':id/scores') saveScores(@Param('id') id: string, @Body() dto: SaveScoresDto) {
    return this.examService.saveScores(id, dto.rows);
  }

  @Patch(':id/payments')
  async savePayments(
    @Param('id') id: string,
    @Body() dto: SavePaymentsDto,
  ) {
    return this.examService.savePayments(id, dto.rows);
  }
  @Delete(':id') delete(@Param('id') id: string) { return this.examService.softDelete(id); }




}
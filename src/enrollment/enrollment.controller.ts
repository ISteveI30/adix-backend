import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseEnumPipe } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { PaginationDto } from 'src/common';
import { Modality } from '@prisma/client';

@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) { }

  @Post()
  create(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    return this.enrollmentService.create(createEnrollmentDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.enrollmentService.findAll(paginationDto);
  }

  @Get('actives')
  findActives(
    @Query('cycleId') cycleId?: string,
    @Query('careerId') careerId?: string,
    @Query('modality') modality?: Modality, // 👈 convierte string a enum
  ) {
    return this.enrollmentService.findActives({
      cycleId,
      careerId,
      modality,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.enrollmentService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEnrollmentDto: UpdateEnrollmentDto) {
    return this.enrollmentService.update(id, updateEnrollmentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.enrollmentService.remove(id);
  }



}

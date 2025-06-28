import { Controller, Get, Post, Body, Patch, Param, Delete, Query, NotFoundException } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PaginationDto } from 'src/common';

@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) { }

  @Post()
  async create(@Body() createStudentDto: StudentDto) {
    return await this.studentService.create(createStudentDto);
  }

  @Get('/findStudentByName')
  async findStudentByName(@Query('query') query: string) {
    return await this.studentService.findStudentByName(query);
  }

  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    return await this.studentService.findAll(paginationDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.studentService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return await this.studentService.update(id, updateStudentDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.studentService.remove(id);
  }

  @Get("findByDni/:dni")
  async getByDni(@Param("dni") dni: string) {
    const student = await this.studentService.findByDni(dni);
    if (!student) throw new NotFoundException("Alumno no encontrado");
    return student;
  }
}

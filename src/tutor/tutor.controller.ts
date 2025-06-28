import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TutorService } from './tutor.service';
import { CreateTutorDto } from './dto/create-tutor.dto';
import { UpdateTutorDto } from './dto/update-tutor.dto';
import { PaginationDto } from 'src/common';

@Controller('tutors')
export class TutorController {
  constructor(private readonly tutorService: TutorService) {}

  @Get('check-dni/:dni')
  async checkDni(@Param('dni') dni: string) {
    return this.tutorService.checkDniAvailability(dni);
  }

  @Post()
  async create(@Body() createTutorDto: CreateTutorDto) {
    return await this.tutorService.create(createTutorDto);
  }
 
  @Get('/tutorSearch')
  async tutorSearch(@Query('query') query: string) {
    return await this.tutorService.tutorSearch(query);
  }

  @Get()
  findAll(@Query() paginationDto:PaginationDto) {
    return this.tutorService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tutorService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTutorDto: UpdateTutorDto) {
    return this.tutorService.update(id, updateTutorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tutorService.remove(id);
  }
}

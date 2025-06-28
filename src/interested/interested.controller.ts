import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { InterestedService } from './interested.service';
import { CreateInterestedDto } from './dto/create-interested.dto';
import { UpdateInterestedDto } from './dto/update-interested.dto';
import { PaginationDto } from 'src/common';

@Controller('interested')
export class InterestedController {
  constructor(private readonly interestedService: InterestedService) { }

  @Post()
  create(@Body() createInterestedDto: CreateInterestedDto) {
    return this.interestedService.create(createInterestedDto);
  }

  @Get()
  findAll(@Query() PaginationDto: PaginationDto) {
    return this.interestedService.findAll(PaginationDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.interestedService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInterestedDto: UpdateInterestedDto) {
    return this.interestedService.update(id, updateInterestedDto);
  }

  @Delete('old')
  deleteOldInterested() {
    return this.interestedService.deleteOldInterested();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.interestedService.remove(id);
  }


}

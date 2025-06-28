import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CycleService } from './cycle.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';

@Controller('cycles')
export class CycleController {
  constructor(private readonly cycleService: CycleService) {}

  @Post()
  create(@Body() createCycleDto: CreateCycleDto) {
    return this.cycleService.create(createCycleDto);
  }

  @Get()
  findAll() {
    return this.cycleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cycleService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCycleDto: UpdateCycleDto) {
    return this.cycleService.update(id, updateCycleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cycleService.remove(id);
  }
}

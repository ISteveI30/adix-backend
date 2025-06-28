import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AccountReceivableService } from './account-receivable.service';
import { CreateAccountReceivableDto } from './dto/create-account-receivable.dto';
import { UpdateAccountReceivableDto } from './dto/update-account-receivable.dto';

@Controller('account-receivables')
export class AccountReceivableController {
  constructor(private readonly accountReceivableService: AccountReceivableService) {}

  @Post()
  create(@Body() createAccountReceivableDto: CreateAccountReceivableDto) {
    return this.accountReceivableService.create(createAccountReceivableDto);
  }

  @Get()
  findAll() {
    return this.accountReceivableService.findAll();
  }

  @Get('/codeStudent/:codeStudent')
  findByCodeStudent(@Param('codeStudent') codeStudent: string) {
    return this.accountReceivableService.findByCodeStudent(codeStudent);
  }
  
  @Get('/student/:id')
  findStudentById(@Param('id') id: string) {
    return this.accountReceivableService.findByStudentId(id);
  }
  
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountReceivableService.findOne(id);
  }


  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAccountReceivableDto: UpdateAccountReceivableDto) {
    return this.accountReceivableService.update(id, updateAccountReceivableDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountReceivableService.remove(id);
  }
}

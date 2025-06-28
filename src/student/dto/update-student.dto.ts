import { PartialType } from '@nestjs/mapped-types';
import { StudentDto } from './create-student.dto';

export class UpdateStudentDto extends PartialType(StudentDto) {}

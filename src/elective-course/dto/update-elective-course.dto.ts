import { PartialType } from '@nestjs/mapped-types';
import { CreateElectiveCourseDto } from './create-elective-course.dto';

export class UpdateElectiveCourseDto extends PartialType(CreateElectiveCourseDto) {}



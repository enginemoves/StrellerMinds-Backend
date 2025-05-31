import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // adjust import path as needed
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CreateCourseDto, UpdateCourseDto } from './course.dto';

@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  async create(@Body() courseData: CreateCourseDto) {
    return this.courseService.create(courseData);
  }

  @Get()
  async findAll() {
    return this.courseService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.courseService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() courseData: UpdateCourseDto,
  ) {
    return this.courseService.update(id, courseData);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.courseService.remove(id);
  }

  // Bulk Create
  @Post('bulk')
  async bulkCreate(@Body() courses: CreateCourseDto[]) {
    return this.courseService.bulkCreate(courses);
  }

  // Bulk Update
  @Put('bulk')
  async bulkUpdate(@Body() courses: { id: number; data: UpdateCourseDto }[]) {
    return this.courseService.bulkUpdate(courses);
  }

  // Bulk Delete
  @Delete('bulk')
  async bulkDelete(@Body() ids: number[]) {
    return this.courseService.bulkDelete(ids);
  }
}

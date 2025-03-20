import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Patch,
    ParseUUIDPipe,
  } from '@nestjs/common';
import { CourseService } from './courses.service';
import { CreateCourseDto } from './dtos/create.course.dto';
import { UpdateCourseDto } from './dtos/update.course.dto';

  
  @Controller('courses')
  export class CourseController {
    constructor(private readonly courseService: CourseService) {}
  
    @Post()
    public async create(@Body() createCourseDto: CreateCourseDto) {
      return await this.courseService.create(createCourseDto);
    }
  
    @Get()
    public async findAll() {
      return await this.courseService.findAll();
    }
  
    @Get(':id')
    public async findOne(@Param('id', ParseUUIDPipe) id: string) {
      return await this.courseService.findOne(id);
    }
  
    @Patch(':id')
    public async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateCourseDto: UpdateCourseDto) {
      return await this.courseService.update(id, updateCourseDto);
    }
  
    @Delete(':id')
    public async delete(@Param('id', ParseUUIDPipe) id: string) {
      return await this.courseService.delete(id);
    }
  }
  
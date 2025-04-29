import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "src/auth/decorators/roles.decorator";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { CreateCourseDto } from "src/courses/dtos/create.course.dto";
import { RolesGuard } from "src/auth/guards/roles.guard"; 
import { CourseService } from "./course.service";
import { UpdateCourseDto } from "src/courses/dtos/update.course.dto";

@ApiTags('Courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('courses')

export class CoursesController {
     constructor(private readonly service: CourseService) {}

     @Post()
     @ApiOperation({ summary: 'Create a course' })
     create(@Body() dto: CreateCourseDto) {
          return this.service.create(dto);
     }

     @Get()
     @ApiOperation({ summary: 'Get all courses' })
     findAll() {
          return this.service.findAll();
     }

     @Get(':id')
     @ApiOperation({ summary: 'Get course by ID' })
     findOne(@Param('id') id: string) {
          return this.service.findOne(id);
     }

     @Patch(':id')
     @ApiOperation({ summary: 'Update course' })
     update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
          return this.service.update(id, dto);
     }

     @Delete(':id')
     @ApiOperation({ summary: 'Delete course' })
     remove(@Param('id') id: string) {
          return this.service.remove(id);
     }
}

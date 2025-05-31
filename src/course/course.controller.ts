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
  BadRequestException,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { CreateCourseDto, UpdateCourseDto } from './course.dto';

@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new course' })
  async create(@Body() courseData: CreateCourseDto) {
    return this.courseService.create(courseData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses' })
  async findAll() {
    return this.courseService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.courseService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a course by ID' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() courseData: UpdateCourseDto,
  ) {
    return this.courseService.update(id, courseData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a course by ID' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.courseService.remove(id);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create courses' })
  async bulkCreate(@Body() courses: CreateCourseDto[]) {
    return this.courseService.bulkCreate(courses);
  }

  @Put('bulk')
  @ApiOperation({ summary: 'Bulk update courses' })
  async bulkUpdate(
    @Body() courses: { id: number; data: UpdateCourseDto }[],
  ) {
    return this.courseService.bulkUpdate(courses);
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Bulk delete courses by IDs' })
  async bulkDelete(@Body() ids: number[]) {
    return this.courseService.bulkDelete(ids);
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get course analytics summary' })
  async getAnalytics() {
    return this.courseService.getCourseAnalytics();
  }

  // ✅ New: Update course status
  @Put(':id/status')
  @ApiOperation({ summary: 'Update course status only' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'published', 'archived'],
          example: 'published',
        },
      },
    },
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    const allowedStatuses = ['draft', 'published', 'archived'];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Allowed values are: ${allowedStatuses.join(', ')}`,
      );
    }

    return this.courseService.updateStatus(id, status);
  }

  // ✅ New: Filter courses by status
  @Get('status/:status')
  @ApiOperation({ summary: 'Get courses by status' })
  async findByStatus(@Param('status') status: string) {
    const allowedStatuses = ['draft', 'published', 'archived'];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Allowed values are: ${allowedStatuses.join(', ')}`,
      );
    }

    return this.courseService.findByStatus(status);
  }
}

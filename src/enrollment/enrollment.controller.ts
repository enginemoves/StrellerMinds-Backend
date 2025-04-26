// src/enrollment/enrollment.controller.ts
import { Controller, Post, Body, Delete, Param, Get, UseGuards } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Enrollment } from './entities/enrollment.entity';

@ApiTags('Enrollment')
@ApiBearerAuth()
@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @ApiOperation({ summary: 'Enroll in a course' })
  @ApiResponse({ status: 201, type: Enrollment })
  async enroll(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    return await this.enrollmentService.enroll(createEnrollmentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Unenroll from a course' })
  @ApiResponse({ status: 200, description: 'Unenrolled successfully.' })
  async unenroll(@Param('id') id: string) {
    await this.enrollmentService.unenroll(id);
    return { message: 'Unenrolled successfully.' };
  }

  @Get()
  @ApiOperation({ summary: 'List all enrollments (testing purpose)' })
  findAll() {
    return this.enrollmentService.findAll();
  }
}

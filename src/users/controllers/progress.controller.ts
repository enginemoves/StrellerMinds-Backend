import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ProgressService } from '../services/progress.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enums/role.enum';
import { UpdateProgressDto } from '../dtos/update-progress.dto';

@Controller('progress')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('courses/:courseId/lessons/:lessonId')
  async updateLessonProgress(
    @Request() req,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() updateProgressDto: UpdateProgressDto,
  ) {
    try {
      return await this.progressService.updateLessonProgress(
        req.user.id,
        courseId,
        lessonId,
        updateProgressDto.progressPercentage,
        updateProgressDto.metadata,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update lesson progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('courses/:courseId')
  async getCourseProgress(
    @Request() req,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    try {
      return await this.progressService.getCourseProgress(req.user.id, courseId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve course progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user')
  async getUserProgress(@Request() req) {
    try {
      return await this.progressService.getUserProgress(req.user.id);
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve user progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('courses/:courseId/sync')
  async syncProgress(
    @Request() req,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    try {
      await this.progressService.syncProgress(req.user.id, courseId);
      return { message: 'Progress synchronized successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to synchronize progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('admin/courses/:courseId')
  @Roles(Role.ADMIN)
  async getCourseProgressAdmin(
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    try {
      return await this.progressService.getCourseProgress(courseId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve admin course progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
} 
import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
    constructor(private readonly progressService: ProgressService) {}

    @Post(':userId/complete/:lessonId')
    completeLesson(
        @Param('userId') userId: number,
        @Param('lessonId') lessonId: number
    ) {
        this.progressService.completeLesson(userId, lessonId);
        return { message: 'Lesson marked as completed' };
    }

    @Get(':userId')
    getUserProgress(
        @Param('userId') userId: number,
        @Query('totalLessons') totalLessons: number
    ) {
        return this.progressService.getProgressData(userId, totalLessons);
    }
}

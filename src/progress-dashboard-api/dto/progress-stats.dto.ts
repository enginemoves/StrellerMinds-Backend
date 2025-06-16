import { ApiProperty } from '@nestjs/swagger';

export class ProgressStatsDto {
  @ApiProperty({ description: 'Overall completion percentage' })
  overallCompletionPercentage: number;

  @ApiProperty({ description: 'Total enrolled courses' })
  totalEnrolledCourses: number;

  @ApiProperty({ description: 'Active courses count' })
  activeCourses: number;

  @ApiProperty({ description: 'Completed courses count' })
  completedCourses: number;

  @ApiProperty({ description: 'Paused courses count' })
  pausedCourses: number;

  @ApiProperty({ description: 'Not started courses count' })
  notStartedCourses: number;

  @ApiProperty({ description: 'Total time spent in hours' })
  totalTimeSpentHours: number;

  @ApiProperty({ description: 'Average completion rate' })
  averageCompletionRate: number;

  @ApiProperty({ description: 'Courses completed this month' })
  coursesCompletedThisMonth: number;

  @ApiProperty({ description: 'Current learning streak in days' })
  currentLearningStreak: number;

  @ApiProperty({ description: 'Longest learning streak in days' })
  longestLearningStreak: number;
}
import { ApiProperty } from '@nestjs/swagger';
import { ProgressStatsDto } from './progress-stats.dto';
import { CourseProgressDto } from './course-progress.dto';
import { RecentActivityDto } from './recent-activity.dto';

export class ProgressDashboardResponseDto {
  @ApiProperty({ description: 'User progress statistics' })
  stats: ProgressStatsDto;

  @ApiProperty({ description: 'Course progress details', type: [CourseProgressDto] })
  courses: CourseProgressDto[];

  @ApiProperty({ description: 'Recent activity', type: [RecentActivityDto] })
  recentActivity: RecentActivityDto[];

  @ApiProperty({ description: 'Total courses count' })
  totalCourses: number;

  @ApiProperty({ description: 'Current page offset' })
  offset: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;
}
import { ApiProperty } from '@nestjs/swagger';

export class RecentActivityDto {
  @ApiProperty({ description: 'Activity date' })
  date: Date;

  @ApiProperty({ description: 'Course ID' })
  courseId: string;

  @ApiProperty({ description: 'Course title' })
  courseTitle: string;

  @ApiProperty({ description: 'Lesson ID' })
  lessonId: string;

  @ApiProperty({ description: 'Lesson title' })
  lessonTitle: string;

  @ApiProperty({ description: 'Activity type' })
  activityType: string;

  @ApiProperty({ description: 'Time spent in minutes' })
  timeSpentMinutes: number;
}


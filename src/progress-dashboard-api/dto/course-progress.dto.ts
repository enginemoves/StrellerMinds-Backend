import { ApiProperty } from '@nestjs/swagger';
import { CourseStatus } from '../enums/course-status.enum';

export class CourseProgressDto {
  @ApiProperty({ description: 'Course ID' })
  courseId: string;

  @ApiProperty({ description: 'Course title' })
  title: string;

  @ApiProperty({ description: 'Course status', enum: CourseStatus })
  status: CourseStatus;

  @ApiProperty({ description: 'Completion percentage (0-100)' })
  completionPercentage: number;

  @ApiProperty({ description: 'Total lessons in course' })
  totalLessons: number;

  @ApiProperty({ description: 'Completed lessons' })
  completedLessons: number;

  @ApiProperty({ description: 'Time spent in hours' })
  timeSpentHours: number;

  @ApiProperty({ description: 'Last activity date' })
  lastActivityDate: Date;

  @ApiProperty({ description: 'Enrollment date' })
  enrollmentDate: Date;

  @ApiProperty({ description: 'Completion date (if completed)' })
  completionDate?: Date;
}
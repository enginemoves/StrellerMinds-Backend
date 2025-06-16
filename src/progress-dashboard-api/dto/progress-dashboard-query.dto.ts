import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CourseStatus } from '../enums/course-status.enum';
import { TimeRange } from '../enums/time-range.enum';
export class ProgressDashboardQueryDto {
  @ApiProperty({ 
    description: 'Filter by course status', 
    enum: CourseStatus, 
    required: false 
  })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiProperty({ 
    description: 'Time range for activity data', 
    enum: TimeRange, 
    required: false,
    default: TimeRange.LAST_30_DAYS
  })
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange = TimeRange.LAST_30_DAYS;

  @ApiProperty({ 
    description: 'Start date for custom range (ISO 8601)', 
    required: false 
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ 
    description: 'End date for custom range (ISO 8601)', 
    required: false 
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ 
    description: 'Number of items per page', 
    minimum: 1, 
    maximum: 100, 
    default: 10,
    required: false 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({ 
    description: 'Page offset', 
    minimum: 0, 
    default: 0,
    required: false 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

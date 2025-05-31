import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { RecurrenceType } from '../entities/mentor-availability.entity';

export class CreateAvailabilityDto {
  @ApiProperty({
    description: 'Start time of availability',
    example: '2025-06-01T14:00:00Z',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'End time of availability',
    example: '2025-06-01T15:00:00Z',
  })
  @IsDateString()
  endTime: string;

  @ApiProperty({
    description: 'Type of recurrence',
    enum: RecurrenceType,
    example: RecurrenceType.WEEKLY,
    required: false,
    default: RecurrenceType.ONCE,
  })
  @IsEnum(RecurrenceType)
  @IsOptional()
  recurrenceType?: RecurrenceType;

  @ApiProperty({
    description: 'Interval for recurrence (e.g., every 2 weeks)',
    example: 1,
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  recurrenceInterval?: number;

  @ApiProperty({
    description: 'End date for recurring availability',
    example: '2025-12-31T23:59:59Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  recurrenceEndDate?: string;

  @ApiProperty({
    description: 'Whether this availability is active',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Notes about this availability',
    example: 'Available for beginner mentees only',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Duration of each mentorship session in minutes',
    example: 60,
    required: false,
    default: 60,
  })
  @IsInt()
  @Min(15)
  @Max(240)
  @IsOptional()
  durationMinutes?: number;

  @ApiProperty({
    description: 'Maximum number of bookings allowed per time slot',
    example: 1,
    required: false,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxBookingsPerSlot?: number;

  @ApiProperty({
    description: 'Additional details as key-value pairs',
    example: { 'meeting-platform': 'zoom', 'preparation-required': true },
    required: false,
  })
  @IsObject()
  @IsOptional()
  additionalDetails?: Record<string, any>;
}

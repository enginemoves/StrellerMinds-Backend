import { IsOptional, IsString, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ElectiveCourseQueryDto {
  @ApiProperty({ 
    required: false, 
    description: 'Search keyword to match in title or description (case-insensitive, partial match)',
    example: 'blockchain'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ 
    required: false, 
    description: 'Filter by category name',
    example: 'Science'
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ 
    required: false, 
    description: 'Filter by credit hours (duration in hours)',
    example: 3
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  creditHours?: number;

  @ApiProperty({ 
    required: false, 
    description: 'Filter active courses only',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;

  @ApiProperty({ 
    required: false, 
    default: 1,
    description: 'Page number for pagination',
    example: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ 
    required: false, 
    default: 10,
    description: 'Number of items per page',
    example: 10
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}

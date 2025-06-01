import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { MatchType } from '../entities/mentorship-match.entity';

export class MatchRequestDto {
  @ApiProperty({
    description: 'Type of match (automatic or manual)',
    enum: MatchType,
    example: MatchType.AUTOMATIC,
    required: false,
    default: MatchType.AUTOMATIC,
  })
  @IsEnum(MatchType)
  @IsOptional()
  matchType?: MatchType;

  @ApiProperty({
    description: 'User ID of the mentee (required for manual matching)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  menteeId?: string;

  @ApiProperty({
    description: 'User ID of the mentor (required for manual matching)',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  mentorId?: string;

  @ApiProperty({
    description: 'Number of matches to return (for automatic matching)',
    example: 5,
    required: false,
    default: 5,
  })
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number;

  @ApiProperty({
    description: 'Minimum compatibility score (0-100) for automatic matches',
    example: 70,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  minScore?: number;

  @ApiProperty({
    description: 'Skills to prioritize in matching',
    example: ['JavaScript', 'React'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  prioritySkills?: string[];

  @ApiProperty({
    description: 'Interests to prioritize in matching',
    example: ['Web Development', 'Mobile Apps'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  priorityInterests?: string[];
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MatchStatus } from '../entities/mentorship-match.entity';

export class UpdateMatchStatusDto {
  @ApiProperty({
    description: 'New status for the mentorship match',
    enum: MatchStatus,
    example: MatchStatus.ACCEPTED,
  })
  @IsEnum(MatchStatus)
  status: MatchStatus;

  @ApiProperty({
    description: 'Feedback or reason for the status change',
    example: 'Looking forward to working together!',
    required: false,
  })
  @IsString()
  @IsOptional()
  feedback?: string;
}

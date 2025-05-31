import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondToFeedbackDto {
  @ApiProperty({ description: 'Response to the feedback', minLength: 5, maxLength: 1000 })
  @IsString()
  @Length(5, 1000)
  response: string;
} 
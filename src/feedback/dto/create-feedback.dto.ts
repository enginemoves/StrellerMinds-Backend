import { IsBoolean, IsString, IsUUID, Length, IsEnum, IsNumber, IsOptional, Min, Max, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty({ description: 'ID of the user receiving the feedback' })
  @IsUUID()
  recipientId: string;

  @ApiProperty({ description: 'Feedback content', minLength: 5, maxLength: 1000 })
  @IsString()
  @Length(5, 1000)
  content: string;

  @ApiProperty({ description: 'Whether the feedback is anonymous' })
  @IsBoolean()
  isAnonymous: boolean;

  @ApiProperty({ description: 'Category of the feedback', enum: ['general', 'assignment', 'project', 'presentation'] })
  @IsEnum(['general', 'assignment', 'project', 'presentation'])
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Rating from 1-5', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiProperty({ description: 'Feedback template with structured fields' })
  @IsObject()
  @IsOptional()
  template?: {
    name: string;
    fields: { [key: string]: string };
  };

  @ApiProperty({ description: 'Visibility level of the feedback', enum: ['public', 'private', 'course'] })
  @IsEnum(['public', 'private', 'course'])
  @IsOptional()
  visibility?: 'public' | 'private' | 'course';
}

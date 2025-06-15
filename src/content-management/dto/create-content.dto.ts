import { IsString, IsOptional, IsEnum, IsObject, IsDateString, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ContentType, ContentStatus } from '../enums/content.enum';

export class CreateContentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ContentType)
  type: ContentType;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus = ContentStatus.DRAFT;

  @IsOptional()
  @IsObject()
  content?: any;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number = 0;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsString()
  createdBy: string;
}
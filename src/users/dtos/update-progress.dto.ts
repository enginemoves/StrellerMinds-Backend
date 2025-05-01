import { IsNumber, IsOptional, Min, Max, IsObject } from 'class-validator';

export class UpdateProgressDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
} 
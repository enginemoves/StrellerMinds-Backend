import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGradeDto {
  @ApiPropertyOptional({ example: 90, description: 'Updated numeric grade.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  numericGrade?: number;

  @ApiPropertyOptional({ example: 'Updated feedback after reassessment.' })
  @IsOptional()
  @IsString()
  feedback?: string;
}

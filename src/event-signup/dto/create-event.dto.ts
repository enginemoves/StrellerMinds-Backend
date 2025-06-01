import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsInt,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  allowWaitlist?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}

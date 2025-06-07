import { IsOptional, IsArray, IsString, IsDateString } from 'class-validator';

export class CreateDeletionRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dataTypes?: string[];

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

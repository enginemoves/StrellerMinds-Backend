import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateContentDto } from './create-content.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateContentDto extends PartialType(
  OmitType(CreateContentDto, ['createdBy'] as const)
) {
  @IsOptional()
  @IsString()
  updatedBy?: string;

  @IsOptional()
  @IsString()
  changelog?: string;
}
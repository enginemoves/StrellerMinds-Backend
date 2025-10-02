import { IsString, IsOptional } from 'class-validator';

export class UploadAssetDto {
  @IsString()
  courseId: string;

  @IsOptional()
  @IsString()
  originalPath?: string;
}

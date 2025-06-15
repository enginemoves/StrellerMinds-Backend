import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class UploadMediaDto {
  @IsString()
  contentId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number = 0;
}

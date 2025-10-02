import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateArtifactDto {
  @IsString()
  imageName: string;

  @IsString()
  imageTag: string;

  @IsOptional()
  @IsString()
  digest?: string;

  @IsOptional()
  @IsString()
  artifactUrl?: string;

  @IsOptional()
  @IsNumber()
  sizeBytes?: number;
}

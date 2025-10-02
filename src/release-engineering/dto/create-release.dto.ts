import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateArtifactDto } from './create-artifact.dto';

export class CreateReleaseDto {
  @IsString()
  semver: string;

  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @IsOptional()
  @IsString()
  changelogUrl?: string;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateArtifactDto)
  artifacts?: CreateArtifactDto[];
}

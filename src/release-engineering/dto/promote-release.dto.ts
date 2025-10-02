import { IsEnum, IsString, IsOptional } from 'class-validator';
import { Env } from '../entities/environment.enum';

export class PromoteReleaseDto {
  @IsEnum(Env)
  targetEnv: Env;

  @IsOptional()
  @IsString()
  triggeredBy?: string;
}

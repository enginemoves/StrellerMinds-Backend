import { IsOptional, IsInt, Min, IsString, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export enum CredentialStatus {
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
  REVOKED = 'REVOKED',
  ALL = 'ALL',
}

export class CredentialHistoryQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  credentialType?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsEnum(CredentialStatus)
  status?: CredentialStatus = CredentialStatus.ALL;
}
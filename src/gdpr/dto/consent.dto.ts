import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ConsentType, ConsentStatus } from '../entities/user-consent.entity';

export class UpdateConsentDto {
  @IsEnum(ConsentType)
  consentType: ConsentType;

  @IsEnum(ConsentStatus)
  status: ConsentStatus;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  legalBasis?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ConsentPreferencesDto {
  @IsOptional()
  @IsEnum(ConsentStatus)
  marketing?: ConsentStatus;

  @IsOptional()
  @IsEnum(ConsentStatus)
  analytics?: ConsentStatus;

  @IsOptional()
  @IsEnum(ConsentStatus)
  functional?: ConsentStatus;
}

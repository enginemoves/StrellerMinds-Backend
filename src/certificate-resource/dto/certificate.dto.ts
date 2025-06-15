import { IsString, IsUUID, IsOptional, IsDateString, IsObject, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateCertificateDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  courseId: string;

  @IsString()
  recipientName: string;

  @IsString()
  courseName: string;

  @IsDateString()
  completionDate: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsObject()
  brandConfig?: any;
}

export class VerifyCertificateDto {
  @IsString()
  certificateNumber: string;
}

export class RevokeCertificateDto {
  @IsUUID()
  certificateId: string;

  @IsString()
  reason: string;
}

export class BrandConfigDto {
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsString()
  signatureUrl?: string;

  @IsOptional()
  @IsString()
  signatoryName?: string;

  @IsOptional()
  @IsString()
  signatoryTitle?: string;
}

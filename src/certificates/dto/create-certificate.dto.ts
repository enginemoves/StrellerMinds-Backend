import { IsString, IsUUID, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCertificateDto {
  @ApiProperty({ description: 'User ID who earned the certificate' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Course ID for which certificate is issued' })
  @IsUUID()
  courseId: string;

  @ApiPropertyOptional({ description: 'Language for certificate localization', enum: ['en', 'es', 'fr'], default: 'en' })
  @IsOptional()
  @IsEnum(['en', 'es', 'fr'])
  language?: string = 'en';

  @ApiPropertyOptional({ description: 'Grade achieved (0-100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  grade?: number;

  @ApiPropertyOptional({ description: 'Instructor name' })
  @IsOptional()
  @IsString()
  instructorName?: string;

  @ApiPropertyOptional({ description: 'Certificate type', default: 'completion' })
  @IsOptional()
  @IsString()
  certificateType?: string = 'completion';
}

export class CertificateMetadataDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  certificateNumber: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  courseId: string;

  @ApiProperty()
  issueDate: Date;

  @ApiProperty()
  qrCode: string;

  @ApiProperty()
  checksum: string;

  @ApiProperty()
  metadata: {
    courseName: string;
    userName: string;
    completionDate: Date;
    grade?: number;
    instructorName?: string;
    certificateType: string;
    issuingInstitution: string;
    language: string;
  };

  @ApiProperty()
  isValid: boolean;

  @ApiProperty()
  createdAt: Date;
}

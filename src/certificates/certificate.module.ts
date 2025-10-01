import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from 'nestjs-i18n';
import { CqrsModule } from '@nestjs/cqrs';
import { CertificateController } from './certificate.controller';
import { CertificateService } from './services/certificate.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { S3StorageService } from './services/s3-storage.service';
import { CourseCompletionHandler } from './handlers/course-completion.handler';
import { Certificate } from './entities/certificate.entity';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, User, Course]),
    ConfigModule,
    I18nModule,
    CqrsModule,
  ],
  controllers: [CertificateController],
  providers: [
    CertificateService,
    PdfGeneratorService,
    S3StorageService,
    CourseCompletionHandler,
  ],
  exports: [
    CertificateService,
    PdfGeneratorService,
    S3StorageService,
  ],
})
export class CertificateModule {}

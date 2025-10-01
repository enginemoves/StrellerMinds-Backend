import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Delete,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CertificateService } from './services/certificate.service';
import { Certificate } from './entities/certificate.entity';
import { CreateCertificateDto, CertificateMetadataDto } from './dto/create-certificate.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('certificates')
@Controller('certificates')
export class CertificateController {
  private readonly logger = new Logger(CertificateController.name);

  constructor(private readonly certificateService: CertificateService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a new certificate' })
  @ApiBody({ type: CreateCertificateDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Certificate generated successfully',
    type: Certificate 
  })
  @ApiResponse({ status: 400, description: 'Bad request - certificate already exists' })
  @ApiResponse({ status: 404, description: 'User or course not found' })
  async generateCertificate(
    @Body() createCertificateDto: CreateCertificateDto,
  ): Promise<Certificate> {
    try {
      return await this.certificateService.generateCertificate(createCertificateDto);
    } catch (error) {
      this.logger.error(`Certificate generation failed: ${error.message}`);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/verify')
  @Public()
  @ApiOperation({ summary: 'Verify certificate authenticity and get metadata' })
  @ApiParam({ name: 'id', description: 'Certificate ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Certificate verification result',
    type: CertificateMetadataDto 
  })
  @ApiResponse({ status: 404, description: 'Certificate not found or invalid' })
  async verifyCertificate(
    @Param('id') certificateId: string,
  ): Promise<CertificateMetadataDto> {
    try {
      return await this.certificateService.verifyCertificate(certificateId);
    } catch (error) {
      this.logger.error(`Certificate verification failed: ${error.message}`);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get certificate details' })
  @ApiParam({ name: 'id', description: 'Certificate ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Certificate details',
    type: Certificate 
  })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async getCertificate(
    @Param('id') certificateId: string,
  ): Promise<Certificate> {
    return this.certificateService.getCertificate(certificateId);
  }

  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get certificate PDF URL' })
  @ApiParam({ name: 'id', description: 'Certificate ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Certificate PDF URL',
    schema: { type: 'object', properties: { pdfUrl: { type: 'string' } } }
  })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  @ApiResponse({ status: 400, description: 'Certificate is not valid' })
  async getCertificatePdf(
    @Param('id') certificateId: string,
  ): Promise<{ pdfUrl: string }> {
    const pdfUrl = await this.certificateService.getCertificatePdfUrl(certificateId);
    return { pdfUrl };
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get certificates for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of user certificates',
    type: [Certificate] 
  })
  async getUserCertificates(
    @Param('userId') userId: string,
  ): Promise<Certificate[]> {
    return this.certificateService.getUserCertificates(userId);
  }

  @Get('course/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get certificates for a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of course certificates',
    type: [Certificate] 
  })
  async getCourseCertificates(
    @Param('courseId') courseId: string,
  ): Promise<Certificate[]> {
    return this.certificateService.getCourseCertificates(courseId);
  }

  @Get('stats/overview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get certificate statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Certificate statistics',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        valid: { type: 'number' },
        invalid: { type: 'number' },
        byLanguage: { type: 'object' },
        byType: { type: 'object' }
      }
    }
  })
  async getCertificateStats(): Promise<{
    total: number;
    valid: number;
    invalid: number;
    byLanguage: Record<string, number>;
    byType: Record<string, number>;
  }> {
    return this.certificateService.getCertificateStats();
  }

  @Patch(':id/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a certificate (mark as invalid)' })
  @ApiParam({ name: 'id', description: 'Certificate ID' })
  @ApiResponse({ status: 200, description: 'Certificate revoked successfully' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async revokeCertificate(
    @Param('id') certificateId: string,
  ): Promise<{ message: string }> {
    await this.certificateService.revokeCertificate(certificateId);
    return { message: 'Certificate revoked successfully' };
  }

  @Post(':id/regenerate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate certificate with updates' })
  @ApiParam({ name: 'id', description: 'Certificate ID to regenerate' })
  @ApiBody({ 
    required: false,
    schema: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['en', 'es', 'fr'] },
        grade: { type: 'number', minimum: 0, maximum: 100 },
        instructorName: { type: 'string' },
        certificateType: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Certificate regenerated successfully',
    type: Certificate 
  })
  @ApiResponse({ status: 404, description: 'Original certificate not found' })
  async regenerateCertificate(
    @Param('id') certificateId: string,
    @Body() updates?: Partial<CreateCertificateDto>,
  ): Promise<Certificate> {
    return this.certificateService.regenerateCertificate(certificateId, updates);
  }

  @Get('me/certificates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get certificates for current user' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of current user certificates',
    type: [Certificate] 
  })
  async getMySecertificates(
    @CurrentUser() user: User,
  ): Promise<Certificate[]> {
    return this.certificateService.getUserCertificates(user.id);
  }
}

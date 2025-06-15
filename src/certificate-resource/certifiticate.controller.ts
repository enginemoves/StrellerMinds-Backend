import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    Response,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { AuthGuard } from '@nestjs/passport';
  import { Response as ExpressResponse, Request as ExpressRequest } from 'express';
  import * as fs from 'fs';
  
  @Controller('certificates')
  export class CertificateController {
    constructor(private readonly certificateService: CertificateService) {}
  
    @Post()
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(HttpStatus.CREATED)
    async generateCertificate(
      @Body() createCertificateDto: CreateCertificateDto,
      @Request() req: ExpressRequest,
    ) {
      const baseUrl = `${req.protocol}://${req.get('Host')}`;
      const certificate = await this.certificateService.generateCertificate(
        createCertificateDto,
        baseUrl,
      );
  
      return {
        message: 'Certificate generated successfully',
        certificate: {
          id: certificate.id,
          certificateNumber: certificate.certificateNumber,
          recipientName: certificate.recipientName,
          courseName: certificate.courseName,
          verificationUrl: certificate.verificationUrl,
          issueDate: certificate.issueDate,
        },
      };
    }
  
    @Get('verify/:certificateNumber')
    async verifyCertificate(@Param('certificateNumber') certificateNumber: string) {
      const verification = await this.certificateService.verifyCertificate(certificateNumber);
      return {
        message: 'Certificate verification successful',
        verification,
      };
    }
  
    @Get('user/:userId')
    @UseGuards(AuthGuard('jwt'))
    async getUserCertificates(@Param('userId', ParseUUIDPipe) userId: string) {
      const certificates = await this.certificateService.getCertificatesByUser(userId);
      return {
        message: 'Certificates retrieved successfully',
        certificates: certificates.map(cert => ({
          id: cert.id,
          certificateNumber: cert.certificateNumber,
          recipientName: cert.recipientName,
          courseName: cert.courseName,
          completionDate: cert.completionDate,
          issueDate: cert.issueDate,
          verificationUrl: cert.verificationUrl,
        })),
      };
    }
  
    @Get('download/:certificateId')
    @UseGuards(AuthGuard('jwt'))
    async downloadCertificate(
      @Param('certificateId', ParseUUIDPipe) certificateId: string,
      @Response() res: ExpressResponse,
    ) {
      const pdfPath = await this.certificateService.downloadCertificate(certificateId);
      
      if (!fs.existsSync(pdfPath)) {
        return res.status(404).json({ message: 'Certificate file not found' });
      }
  
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificateId}.pdf"`);
      
      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);
    }
  
    @Delete(':certificateId/revoke')
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(HttpStatus.NO_CONTENT)
    async revokeCertificate(
      @Param('certificateId', ParseUUIDPipe) certificateId: string,
      @Body() revokeCertificateDto: RevokeCertificateDto,
    ) {
      await this.certificateService.revokeCertificate(
        certificateId,
        revokeCertificateDto.reason,
      );
      return { message: 'Certificate revoked successfully' };
    }
  }
  
  // ===== CERTIFICATE MODULE =====
  import { Module } from '@nestjs/common';
  import { TypeOrmModule } from '@nestjs/typeorm';
  
  @Module({
    imports: [
      TypeOrmModule.forFeature([Certificate, CertificateTemplate]),
    ],
    controllers: [CertificateController],
    providers: [CertificateService],
    exports: [CertificateService],
  })
  export class CertificateModule {}
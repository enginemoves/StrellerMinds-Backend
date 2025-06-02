import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GdprService } from './gdpr.service';
import { UpdateConsentDto, ConsentPreferencesDto } from './dto/consent.dto';
import { DataExportRequestDto } from './dto/data-export.dto';
import { CreateDeletionRequestDto } from './dto/deletion-request.dto';

// Add your authentication guard here
// @UseGuards(AuthGuard)
@Controller('gdpr')
export class GdprController {
  constructor(private gdprService: GdprService) {}

  // ==================== CONSENT ENDPOINTS ====================
  @Get('consents/:userId')
  async getUserConsents(@Param('userId') userId: string) {
    return this.gdprService.getConsentService().getUserConsents(userId);
  }

  @Put('consents/:userId')
  async updateConsent(
    @Param('userId') userId: string,
    @Body() updateConsentDto: UpdateConsentDto,
  ) {
    return this.gdprService
      .getConsentService()
      .updateConsent(userId, updateConsentDto);
  }

  @Put('consents/:userId/preferences')
  async updateConsentPreferences(
    @Param('userId') userId: string,
    @Body() preferences: ConsentPreferencesDto,
  ) {
    return this.gdprService
      .getConsentService()
      .updateConsentPreferences(userId, preferences);
  }

  @Post('consents/:userId/withdraw-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async withdrawAllConsents(@Param('userId') userId: string) {
    await this.gdprService.getConsentService().withdrawAllConsents(userId);
  }

  // ==================== DATA EXPORT ENDPOINTS ====================
  @Post('export/:userId')
  async exportUserData(
    @Param('userId') userId: string,
    @Body() exportRequest: DataExportRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const userAgent = req.get('User-Agent') || 'Unknown';

    const { data, filename } = await this.gdprService
      .getDataExportService()
      .exportUserData(userId, exportRequest, ipAddress, userAgent);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    if (typeof data === 'string') {
      res.send(data);
    } else {
      res.json(data);
    }
  }

  // ==================== DATA DELETION ENDPOINTS ====================
  @Post('deletion-request/:userId')
  async createDeletionRequest(
    @Param('userId') userId: string,
    @Body() deletionRequest: CreateDeletionRequestDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const userAgent = req.get('User-Agent') || 'Unknown';

    return this.gdprService
      .getDataDeletionService()
      .createDeletionRequest(userId, deletionRequest, ipAddress, userAgent);
  }

  @Get('deletion-requests/:userId')
  async getDeletionRequests(@Param('userId') userId: string) {
    return this.gdprService
      .getDataDeletionService()
      .getDeletionRequests(userId);
  }

  @Post('deletion-request/:requestId/process')
  @HttpCode(HttpStatus.NO_CONTENT)
  async processDeletionRequest(@Param('requestId') requestId: string) {
    await this.gdprService
      .getDataDeletionService()
      .processDeletionRequest(requestId);
  }

  // ==================== COMPLIANCE ENDPOINTS ====================
  @Get('compliance-report/:userId')
  async getComplianceReport(@Param('userId') userId: string) {
    return this.gdprService.generateComplianceReport(userId);
  }
}

import { Injectable } from '@nestjs/common';
import { ConsentService } from './consent.service';
import { DataExportService } from './data-export.service';
import { DataDeletionService } from './data-deletion.service';

@Injectable()
export class GdprService {
  constructor(
    private consentService: ConsentService,
    private dataExportService: DataExportService,
    private dataDeletionService: DataDeletionService,
  ) {}

  // Expose all GDPR-related functionality through this main service
  getConsentService() {
    return this.consentService;
  }

  getDataExportService() {
    return this.dataExportService;
  }

  getDataDeletionService() {
    return this.dataDeletionService;
  }

  async generateComplianceReport(userId: string): Promise<any> {
    const consents = await this.consentService.getUserConsents(userId);
    const deletionRequests =
      await this.dataDeletionService.getDeletionRequests(userId);

    return {
      userId,
      generatedAt: new Date().toISOString(),
      consents: consents.length,
      activeDeletionRequests: deletionRequests.filter(
        (r) => r.status === 'pending' || r.status === 'in_progress',
      ).length,
      completedDeletionRequests: deletionRequests.filter(
        (r) => r.status === 'completed',
      ).length,
    };
  }
}

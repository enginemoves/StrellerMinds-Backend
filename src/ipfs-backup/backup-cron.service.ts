import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IpfsBackupService } from './ipfs-backup.service';

@Injectable()
export class BackupCronService {
  private readonly logger = new Logger(BackupCronService.name);

  constructor(private readonly backupService: IpfsBackupService) {}

  // Cron expression from env or default every 5 minutes
  @Cron(process.env.CID_RETRY_CRON ?? '*/5 * * * *')
  async handleCron() {
    try {
      const processed = await this.backupService.processPendingBackups(25);
      this.logger.log(`Processed ${processed} pending backups`);
    } catch (err) {
      this.logger.error('Scheduled backup run failed', err);
    }
  }
}

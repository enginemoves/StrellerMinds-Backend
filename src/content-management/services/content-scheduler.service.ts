import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContentService } from './content.service';

@Injectable()
export class ContentSchedulerService {
  private readonly logger = new Logger(ContentSchedulerService.name);

  constructor(private readonly contentService: ContentService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledContent() {
    try {
      await this.contentService.processScheduledContent();
    } catch (error) {
      this.logger.error('Failed to process scheduled content', error);
    }
  }
}
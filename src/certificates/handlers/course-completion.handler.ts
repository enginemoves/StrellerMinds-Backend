import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CertificateService } from '../services/certificate.service';
import { CourseEnrollmentCompletedEvent } from '../../common/events/domain/course/course-enrollment-completed.event';

@EventsHandler(CourseEnrollmentCompletedEvent)
export class CourseCompletionHandler implements IEventHandler<CourseEnrollmentCompletedEvent> {
  private readonly logger = new Logger(CourseCompletionHandler.name);

  constructor(private readonly certificateService: CertificateService) {}

  async handle(event: CourseEnrollmentCompletedEvent): Promise<void> {
    try {
      const payload = event.getPayload();
      this.logger.log(
        `Handling course completion for user ${payload.userId} and course ${payload.courseId}`,
      );

      // Generate certificate automatically (grade/instructor may be undefined in this event)
      await this.certificateService.generateCertificate({
        userId: payload.userId,
        courseId: payload.courseId,
        language: 'en',
        certificateType: 'completion',
      });

      this.logger.log(`Certificate generation triggered for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate certificate for course completion: ${error.message}`,
        error.stack,
      );
      // Do not rethrow to avoid breaking the completion flow
    }
  }
}

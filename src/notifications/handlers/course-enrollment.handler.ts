import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CourseEnrollmentCompletedEvent } from '../../common/events/domain/course/course-enrollment-completed.event';

@EventsHandler(CourseEnrollmentCompletedEvent)
export class CourseEnrollmentHandler implements IEventHandler<CourseEnrollmentCompletedEvent> {
  private readonly logger = new Logger(CourseEnrollmentHandler.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async handle(event: CourseEnrollmentCompletedEvent) {
    try {
      const payload = event.getPayload();
      
      this.logger.log(
        `Handling course enrollment completion for user ${payload.userId} in course ${payload.courseId}`,
      );

      // Emit event for WebSocket notification
      this.eventEmitter.emit('course.enrollment.completed', {
        userId: payload.userId,
        courseId: payload.courseId,
        courseName: payload.courseName,
        enrollmentType: payload.enrollmentType,
        completedAt: payload.completedAt,
        certificateEligible: payload.certificateEligible,
      });

      // Optional: Log for analytics
      this.logger.debug(
        `Course enrollment event emitted for user ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle course enrollment event: ${error.message}`,
        error.stack,
      );
    }
  }
}

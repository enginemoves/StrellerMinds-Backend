import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Define the lesson published event payload
export interface LessonPublishedPayload {
  lessonId: string;
  courseId: string;
  courseName: string;
  lessonTitle: string;
  instructorId: string;
  publishedAt: Date;
  lessonType?: 'video' | 'text' | 'interactive' | 'assignment';
  estimatedDuration?: number; // in minutes
}

@Injectable()
export class LessonPublishedHandler {
  private readonly logger = new Logger(LessonPublishedHandler.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('lesson.published')
  async handleLessonPublished(payload: LessonPublishedPayload) {
    try {
      this.logger.log(
        `Handling lesson published event for lesson ${payload.lessonId} in course ${payload.courseId}`,
      );

      // Emit event for WebSocket notification to all enrolled users
      this.eventEmitter.emit('course.lesson.published', {
        courseId: payload.courseId,
        courseName: payload.courseName,
        lessonId: payload.lessonId,
        lessonTitle: payload.lessonTitle,
        instructorId: payload.instructorId,
        publishedAt: payload.publishedAt,
        lessonType: payload.lessonType,
        estimatedDuration: payload.estimatedDuration,
      });

      this.logger.debug(
        `Lesson published notification emitted for course ${payload.courseId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle lesson published event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('lesson.updated')
  async handleLessonUpdated(payload: LessonPublishedPayload & { updateType: string }) {
    try {
      this.logger.log(
        `Handling lesson updated event for lesson ${payload.lessonId} in course ${payload.courseId}`,
      );

      // Only notify for significant updates (not minor edits)
      const significantUpdates = ['content_major', 'requirements_changed', 'deadline_changed'];
      if (significantUpdates.includes(payload.updateType)) {
        this.eventEmitter.emit('course.lesson.updated', {
          courseId: payload.courseId,
          courseName: payload.courseName,
          lessonId: payload.lessonId,
          lessonTitle: payload.lessonTitle,
          updateType: payload.updateType,
          updatedAt: new Date(),
        });

        this.logger.debug(
          `Lesson updated notification emitted for course ${payload.courseId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle lesson updated event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('lesson.assignment.posted')
  async handleAssignmentPosted(payload: {
    assignmentId: string;
    lessonId: string;
    courseId: string;
    courseName: string;
    assignmentTitle: string;
    dueDate?: Date;
    instructorId: string;
  }) {
    try {
      this.logger.log(
        `Handling assignment posted event for assignment ${payload.assignmentId} in course ${payload.courseId}`,
      );

      this.eventEmitter.emit('course.assignment.posted', {
        courseId: payload.courseId,
        courseName: payload.courseName,
        lessonId: payload.lessonId,
        assignmentId: payload.assignmentId,
        assignmentTitle: payload.assignmentTitle,
        dueDate: payload.dueDate,
        postedAt: new Date(),
      });

      this.logger.debug(
        `Assignment posted notification emitted for course ${payload.courseId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle assignment posted event: ${error.message}`,
        error.stack,
      );
    }
  }
}

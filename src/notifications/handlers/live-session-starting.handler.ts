import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface LiveSessionPayload {
  sessionId: string;
  sessionTitle: string;
  courseId: string;
  courseName: string;
  instructorId: string;
  instructorName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  sessionType: 'lecture' | 'workshop' | 'q&a' | 'office_hours' | 'demo';
  maxAttendees?: number;
  registeredCount?: number;
  meetingUrl?: string;
  description?: string;
  prerequisites?: string[];
  isRecorded?: boolean;
}

@Injectable()
export class LiveSessionStartingHandler {
  private readonly logger = new Logger(LiveSessionStartingHandler.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('live.session.scheduled')
  async handleSessionScheduled(payload: LiveSessionPayload) {
    try {
      this.logger.log(
        `Handling live session scheduled event for session ${payload.sessionId} in course ${payload.courseId}`,
      );

      this.eventEmitter.emit('live.session.scheduled', {
        sessionId: payload.sessionId,
        sessionTitle: payload.sessionTitle,
        courseId: payload.courseId,
        courseName: payload.courseName,
        instructorId: payload.instructorId,
        instructorName: payload.instructorName,
        startTime: payload.startTime,
        endTime: payload.endTime,
        duration: payload.duration,
        sessionType: payload.sessionType,
        maxAttendees: payload.maxAttendees,
        registeredCount: payload.registeredCount,
        scheduledAt: new Date(),
      });

      this.logger.debug(
        `Live session scheduled notification emitted for course ${payload.courseId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle live session scheduled event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('live.session.reminder.24h')
  async handleSession24HourReminder(payload: LiveSessionPayload) {
    try {
      this.logger.log(
        `Handling 24-hour reminder for session ${payload.sessionId}`,
      );

      this.eventEmitter.emit('live.session.reminder', {
        sessionId: payload.sessionId,
        sessionTitle: payload.sessionTitle,
        courseId: payload.courseId,
        courseName: payload.courseName,
        instructorName: payload.instructorName,
        startTime: payload.startTime,
        reminderType: '24h',
        timeUntil: payload.startTime.getTime() - Date.now(),
        sessionType: payload.sessionType,
        description: payload.description,
      });

      this.logger.debug(
        `24-hour session reminder notification emitted for course ${payload.courseId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle 24-hour session reminder: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('live.session.reminder.1h')
  async handleSession1HourReminder(payload: LiveSessionPayload) {
    try {
      this.logger.log(
        `Handling 1-hour reminder for session ${payload.sessionId}`,
      );

      this.eventEmitter.emit('live.session.reminder', {
        sessionId: payload.sessionId,
        sessionTitle: payload.sessionTitle,
        courseId: payload.courseId,
        courseName: payload.courseName,
        instructorName: payload.instructorName,
        startTime: payload.startTime,
        reminderType: '1h',
        timeUntil: payload.startTime.getTime() - Date.now(),
        sessionType: payload.sessionType,
        meetingUrl: payload.meetingUrl,
      });

      this.logger.debug(
        `1-hour session reminder notification emitted for course ${payload.courseId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle 1-hour session reminder: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('live.session.starting')
  async handleSessionStarting(payload: LiveSessionPayload) {
    try {
      this.logger.log(
        `Handling live session starting event for session ${payload.sessionId}`,
      );

      this.eventEmitter.emit('live.session.starting', {
        sessionId: payload.sessionId,
        sessionTitle: payload.sessionTitle,
        courseId: payload.courseId,
        courseName: payload.courseName,
        instructorName: payload.instructorName,
        startTime: payload.startTime,
        sessionType: payload.sessionType,
        meetingUrl: payload.meetingUrl,
        isRecorded: payload.isRecorded,
        maxAttendees: payload.maxAttendees,
        registeredCount: payload.registeredCount,
      });

      this.logger.debug(
        `Live session starting notification emitted for course ${payload.courseId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle live session starting event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('live.session.started')
  async handleSessionStarted(payload: LiveSessionPayload & { actualStartTime: Date }) {
    try {
      this.logger.log(
        `Handling live session started event for session ${payload.sessionId}`,
      );

      this.eventEmitter.emit('live.session.started', {
        sessionId: payload.sessionId,
        sessionTitle: payload.sessionTitle,
        courseId: payload.courseId,
        courseName: payload.courseName,
        instructorName: payload.instructorName,
        actualStartTime: payload.actualStartTime,
        sessionType: payload.sessionType,
        meetingUrl: payload.meetingUrl,
        isLive: true,
      });

      this.logger.debug(
        `Live session started notification emitted for course ${payload.courseId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle live session started event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('live.session.ended')
  async handleSessionEnded(payload: LiveSessionPayload & { 
    actualEndTime: Date;
    attendeeCount: number;
    recordingUrl?: string;
  }) {
    try {
      this.logger.log(
        `Handling live session ended event for session ${payload.sessionId}`,
      );

      this.eventEmitter.emit('live.session.ended', {
        sessionId: payload.sessionId,
        sessionTitle: payload.sessionTitle,
        courseId: payload.courseId,
        courseName: payload.courseName,
        instructorName: payload.instructorName,
        actualEndTime: payload.actualEndTime,
        duration: Math.floor((payload.actualEndTime.getTime() - payload.startTime.getTime()) / 60000), // in minutes
        attendeeCount: payload.attendeeCount,
        recordingUrl: payload.recordingUrl,
        isRecorded: payload.isRecorded,
      });

      this.logger.debug(
        `Live session ended notification emitted for course ${payload.courseId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle live session ended event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('live.session.recording.available')
  async handleRecordingAvailable(payload: {
    sessionId: string;
    sessionTitle: string;
    courseId: string;
    courseName: string;
    recordingUrl: string;
    duration: number;
    availableAt: Date;
    expiresAt?: Date;
  }) {
    try {
      this.logger.log(
        `Handling recording available event for session ${payload.sessionId}`,
      );

      this.eventEmitter.emit('live.session.recording.available', {
        sessionId: payload.sessionId,
        sessionTitle: payload.sessionTitle,
        courseId: payload.courseId,
        courseName: payload.courseName,
        recordingUrl: payload.recordingUrl,
        duration: payload.duration,
        availableAt: payload.availableAt,
        expiresAt: payload.expiresAt,
      });

      this.logger.debug(
        `Session recording available notification emitted for course ${payload.courseId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle recording available event: ${error.message}`,
        error.stack,
      );
    }
  }
}

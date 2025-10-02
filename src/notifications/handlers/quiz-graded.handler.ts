import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface QuizGradedPayload {
  quizId: string;
  quizTitle: string;
  userId: string;
  courseId?: string;
  courseName?: string;
  score: number;
  maxScore: number;
  percentage: number;
  passingScore?: number;
  isPassing: boolean;
  gradedAt: Date;
  gradedBy?: string; // instructor or system
  feedback?: string;
  timeSpent?: number; // in seconds
  retakeAllowed?: boolean;
  certificateEligible?: boolean;
}

@Injectable()
export class QuizGradedHandler {
  private readonly logger = new Logger(QuizGradedHandler.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('quiz.graded')
  async handleQuizGraded(payload: QuizGradedPayload) {
    try {
      this.logger.log(
        `Handling quiz graded event for quiz ${payload.quizId} by user ${payload.userId}`,
      );

      // Emit event for WebSocket notification
      this.eventEmitter.emit('quiz.graded', {
        userId: payload.userId,
        quizId: payload.quizId,
        quizTitle: payload.quizTitle,
        courseId: payload.courseId,
        courseName: payload.courseName,
        score: payload.score,
        maxScore: payload.maxScore,
        percentage: payload.percentage,
        isPassing: payload.isPassing,
        gradedAt: payload.gradedAt,
        feedback: payload.feedback,
        retakeAllowed: payload.retakeAllowed,
        certificateEligible: payload.certificateEligible,
      });

      // If it's a significant achievement (high score or passing), emit special event
      if (payload.isPassing && payload.percentage >= 90) {
        this.eventEmitter.emit('quiz.achievement.high_score', {
          userId: payload.userId,
          quizId: payload.quizId,
          quizTitle: payload.quizTitle,
          courseId: payload.courseId,
          courseName: payload.courseName,
          percentage: payload.percentage,
          achievementType: 'excellence',
        });

        this.logger.debug(
          `High score achievement notification emitted for user ${payload.userId}`,
        );
      }

      this.logger.debug(
        `Quiz graded notification emitted for user ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle quiz graded event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('quiz.failed')
  async handleQuizFailed(payload: QuizGradedPayload) {
    try {
      this.logger.log(
        `Handling quiz failed event for quiz ${payload.quizId} by user ${payload.userId}`,
      );

      this.eventEmitter.emit('quiz.failed', {
        userId: payload.userId,
        quizId: payload.quizId,
        quizTitle: payload.quizTitle,
        courseId: payload.courseId,
        courseName: payload.courseName,
        score: payload.score,
        maxScore: payload.maxScore,
        percentage: payload.percentage,
        passingScore: payload.passingScore,
        retakeAllowed: payload.retakeAllowed,
        feedback: payload.feedback,
        failedAt: payload.gradedAt,
      });

      this.logger.debug(
        `Quiz failed notification emitted for user ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle quiz failed event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('quiz.retake_available')
  async handleQuizRetakeAvailable(payload: {
    quizId: string;
    quizTitle: string;
    userId: string;
    courseId?: string;
    courseName?: string;
    previousAttempts: number;
    maxAttempts: number;
    availableAt: Date;
    expiresAt?: Date;
  }) {
    try {
      this.logger.log(
        `Handling quiz retake available event for quiz ${payload.quizId} by user ${payload.userId}`,
      );

      this.eventEmitter.emit('quiz.retake_available', {
        userId: payload.userId,
        quizId: payload.quizId,
        quizTitle: payload.quizTitle,
        courseId: payload.courseId,
        courseName: payload.courseName,
        previousAttempts: payload.previousAttempts,
        maxAttempts: payload.maxAttempts,
        availableAt: payload.availableAt,
        expiresAt: payload.expiresAt,
      });

      this.logger.debug(
        `Quiz retake available notification emitted for user ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle quiz retake available event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('quiz.deadline_reminder')
  async handleQuizDeadlineReminder(payload: {
    quizId: string;
    quizTitle: string;
    courseId: string;
    courseName: string;
    deadline: Date;
    reminderType: '24h' | '1h' | 'final';
    enrolledUsers: string[];
  }) {
    try {
      this.logger.log(
        `Handling quiz deadline reminder for quiz ${payload.quizId} in course ${payload.courseId}`,
      );

      // Emit for each enrolled user who hasn't completed the quiz
      payload.enrolledUsers.forEach(userId => {
        this.eventEmitter.emit('quiz.deadline_reminder', {
          userId,
          quizId: payload.quizId,
          quizTitle: payload.quizTitle,
          courseId: payload.courseId,
          courseName: payload.courseName,
          deadline: payload.deadline,
          reminderType: payload.reminderType,
          timeRemaining: payload.deadline.getTime() - Date.now(),
        });
      });

      this.logger.debug(
        `Quiz deadline reminder notifications emitted for ${payload.enrolledUsers.length} users`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle quiz deadline reminder event: ${error.message}`,
        error.stack,
      );
    }
  }
}

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  UseGuards,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { WsJwtGuard } from '../guards/ws-jwt.guard';
import { NotificationsService } from '../services/notifications.service';
import { NotificationSubscriptionService } from '../services/notification-subscription.service';
import { EnrollmentService } from '../../enrollment/enrollment.service';
import {
  NotificationEventType,
  SubscriptionScope,
} from '../entities/notification-subscription.entity';

interface AuthenticatedSocket extends Socket {
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // Track active connections by user ID
  private userConnections = new Map<string, Set<string>>();

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly subscriptionService: NotificationSubscriptionService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client attempting connection: ${client.id}`);

    try {
      // Authenticate the connection
      const guard = new WsJwtGuard(
        this.notificationsService['jwtService'],
        this.notificationsService['configService'],
        this.notificationsService['usersService'],
      );

      const canActivate = await guard.canActivate({
        switchToWs: () => ({ getClient: () => client }),
      });

      if (!canActivate) {
        client.disconnect();
        return;
      }

      const authClient = client as AuthenticatedSocket;
      const userId = authClient.user.id;

      // Track the connection
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(client.id);

      // Join user-specific room
      await client.join(`user:${userId}`);

      // Join course-specific rooms for enrolled courses
      const userCourses = await this.getUserEnrolledCourses(userId);
      for (const courseId of userCourses) {
        await client.join(`course:${courseId}`);
      }

      // Send initial notification count
      const unreadCount = await this.notificationsService.getUnreadCount(userId);
      client.emit('notification:unread_count', { count: unreadCount });

      this.logger.log(
        `Client ${client.id} connected successfully for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Connection failed for ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const authClient = client as AuthenticatedSocket;
    if (authClient.user?.id) {
      const userId = authClient.user.id;
      const userSockets = this.userConnections.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userConnections.delete(userId);
        }
      }
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('notification:join_course')
  async joinCourseRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { courseId: string },
  ) {
    try {
      // Verify user is enrolled in the course
      const isEnrolled = await this.verifyUserCourseEnrollment(
        client.user.id,
        data.courseId,
      );
      
      if (isEnrolled) {
        await client.join(`course:${data.courseId}`);
        this.logger.log(
          `User ${client.user.id} joined course room: ${data.courseId}`,
        );
        return { success: true, message: 'Joined course notifications' };
      } else {
        return { success: false, message: 'Not enrolled in course' };
      }
    } catch (error) {
      this.logger.error(`Failed to join course room: ${error.message}`);
      return { success: false, message: 'Failed to join course notifications' };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('notification:leave_course')
  async leaveCourseRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { courseId: string },
  ) {
    await client.leave(`course:${data.courseId}`);
    this.logger.log(
      `User ${client.user.id} left course room: ${data.courseId}`,
    );
    return { success: true, message: 'Left course notifications' };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('notification:mark_read')
  async markNotificationAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    try {
      await this.notificationsService.markAsRead(
        data.notificationId,
        client.user.id,
      );
      
      // Update unread count
      const unreadCount = await this.notificationsService.getUnreadCount(
        client.user.id,
      );
      client.emit('notification:unread_count', { count: unreadCount });
      
      return { success: true, message: 'Notification marked as read' };
    } catch (error) {
      this.logger.error(`Failed to mark notification as read: ${error.message}`);
      return { success: false, message: 'Failed to mark as read' };
    }
  }

  // Event listeners for domain events
  @OnEvent('course.enrollment.completed')
  async handleCourseEnrollmentCompleted(payload: {
    userId: string;
    courseId: string;
    courseName: string;
    enrollmentType: string;
  }) {
    const notification = {
      eventType: NotificationEventType.COURSE_ENROLLMENT,
      scope: SubscriptionScope.USER,
      scopeId: payload.userId,
      title: 'Course Enrollment Completed',
      message: `You have successfully enrolled in "${payload.courseName}"`,
      data: {
        courseId: payload.courseId,
        courseName: payload.courseName,
        enrollmentType: payload.enrollmentType,
      },
    };

    await this.emitToUser(payload.userId, 'notification:new', notification);
  }

  @OnEvent('course.lesson.published')
  async handleLessonPublished(payload: {
    courseId: string;
    courseName: string;
    lessonId: string;
    lessonTitle: string;
  }) {
    const notification = {
      eventType: NotificationEventType.COURSE_LESSON_PUBLISHED,
      scope: SubscriptionScope.COURSE,
      scopeId: payload.courseId,
      title: 'New Lesson Published',
      message: `A new lesson "${payload.lessonTitle}" is available in ${payload.courseName}`,
      data: {
        courseId: payload.courseId,
        courseName: payload.courseName,
        lessonId: payload.lessonId,
        lessonTitle: payload.lessonTitle,
      },
    };

    await this.emitToCourse(payload.courseId, 'notification:new', notification);
  }

  @OnEvent('quiz.graded')
  async handleQuizGraded(payload: {
    userId: string;
    quizId: string;
    quizTitle: string;
    courseId?: string;
    score: number;
    maxScore: number;
  }) {
    const notification = {
      eventType: NotificationEventType.QUIZ_GRADED,
      scope: SubscriptionScope.USER,
      scopeId: payload.userId,
      title: 'Quiz Graded',
      message: `Your quiz "${payload.quizTitle}" has been graded. Score: ${payload.score}/${payload.maxScore}`,
      data: {
        quizId: payload.quizId,
        quizTitle: payload.quizTitle,
        courseId: payload.courseId,
        score: payload.score,
        maxScore: payload.maxScore,
        percentage: Math.round((payload.score / payload.maxScore) * 100),
      },
    };

    await this.emitToUser(payload.userId, 'notification:new', notification);
  }

  @OnEvent('live.session.starting')
  async handleLiveSessionStarting(payload: {
    courseId: string;
    courseName: string;
    sessionId: string;
    sessionTitle: string;
    startTime: Date;
  }) {
    const notification = {
      eventType: NotificationEventType.LIVE_SESSION_STARTING,
      scope: SubscriptionScope.COURSE,
      scopeId: payload.courseId,
      title: 'Live Session Starting Soon',
      message: `Live session "${payload.sessionTitle}" for ${payload.courseName} starts in 15 minutes`,
      data: {
        courseId: payload.courseId,
        courseName: payload.courseName,
        sessionId: payload.sessionId,
        sessionTitle: payload.sessionTitle,
        startTime: payload.startTime,
      },
    };

    await this.emitToCourse(payload.courseId, 'notification:new', notification);
  }

  private async emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
    
    // Store notification in database
    await this.notificationsService.create({
      userId,
      eventType: data.eventType,
      scope: data.scope,
      scopeId: data.scopeId,
      title: data.title,
      message: data.message,
      data: data.data,
    });
    
    this.logger.debug(`Emitted ${event} to user ${userId}`);
  }

  private async emitToCourse(courseId: string, event: string, data: any) {
    this.server.to(`course:${courseId}`).emit(event, data);
    
    // Store notification for all enrolled users
    const enrolledUsers = await this.getCourseEnrolledUsers(courseId);
    for (const userId of enrolledUsers) {
      await this.notificationsService.create({
        userId,
        eventType: data.eventType,
        scope: data.scope,
        scopeId: data.scopeId,
        title: data.title,
        message: data.message,
        data: data.data,
      });
    }
    
    this.logger.debug(`Emitted ${event} to course ${courseId}`);
  }

  private async getUserEnrolledCourses(userId: string): Promise<string[]> {
    try {
      const enrollments = await this.enrollmentService.findAll();
      return enrollments
        .filter(enrollment => 
          enrollment.studentId === userId && 
          enrollment.status === 'ENROLLED'
        )
        .map(enrollment => enrollment.courseId);
    } catch (error) {
      this.logger.error(`Failed to get user enrolled courses: ${error.message}`);
      return [];
    }
  }

  private async verifyUserCourseEnrollment(
    userId: string,
    courseId: string,
  ): Promise<boolean> {
    try {
      // Implement your enrollment verification logic here
      const enrolledCourses = await this.getUserEnrolledCourses(userId);
      return enrolledCourses.includes(courseId);
    } catch (error) {
      this.logger.error(`Failed to verify course enrollment: ${error.message}`);
      return false;
    }
  }

  private async getCourseEnrolledUsers(courseId: string): Promise<string[]> {
    try {
      const enrollments = await this.enrollmentService.findAll();
      return enrollments
        .filter(enrollment => 
          enrollment.courseId === courseId && 
          enrollment.status === 'ENROLLED'
        )
        .map(enrollment => enrollment.studentId);
    } catch (error) {
      this.logger.error(`Failed to get course enrolled users: ${error.message}`);
      return [];
    }
  }
}

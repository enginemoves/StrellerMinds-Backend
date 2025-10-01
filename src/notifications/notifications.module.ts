import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';

// Entities
import { NotificationSubscription } from './entities/notification-subscription.entity';
import { NotificationEvent } from './entities/notification-event.entity';

// Gateway
import { NotificationsGateway } from './gateway/notifications.gateway';

// Services
import { NotificationsService } from './services/notifications.service';
import { NotificationSubscriptionService } from './services/notification-subscription.service';
import { NotificationEventService } from './services/notification-event.service';

// Controllers
import { NotificationsController } from './controllers/notifications.controller';

// Event Handlers
import { CourseEnrollmentHandler } from './handlers/course-enrollment.handler';
import { LessonPublishedHandler } from './handlers/lesson-published.handler';
import { QuizGradedHandler } from './handlers/quiz-graded.handler';
import { LiveSessionStartingHandler } from './handlers/live-session-starting.handler';

// Guards
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationSubscription, NotificationEvent]),
    CqrsModule,
    EventEmitterModule.forRoot(),
    AuthModule,
    UsersModule,
    CoursesModule,
    EnrollmentModule,
  ],
  providers: [
    NotificationsGateway,
    NotificationsService,
    NotificationSubscriptionService,
    NotificationEventService,
    WsJwtGuard,
    // Event handlers
    CourseEnrollmentHandler,
    LessonPublishedHandler,
    QuizGradedHandler,
    LiveSessionStartingHandler,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService, NotificationSubscriptionService],
})
export class NotificationsModule {}

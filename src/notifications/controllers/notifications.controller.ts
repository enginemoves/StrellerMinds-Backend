import {
  Controller,
  Post,
  Delete,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { NotificationsService } from '../services/notifications.service';
import { NotificationSubscriptionService } from '../services/notification-subscription.service';
import { NotificationEventService } from '../services/notification-event.service';
import {
  NotificationEventType,
  SubscriptionScope,
} from '../entities/notification-subscription.entity';
import { DeliveryStatus } from '../entities/notification-event.entity';

// DTOs
export class SubscribeDto {
  eventType: NotificationEventType;
  scope: SubscriptionScope;
  scopeId?: string;
  preferences?: {
    realtime?: boolean;
    email?: boolean;
    push?: boolean;
  };
}

export class UnsubscribeDto {
  eventType: NotificationEventType;
  scope: SubscriptionScope;
  scopeId?: string;
}

export class UpdatePreferencesDto {
  preferences?: {
    realtime?: boolean;
    email?: boolean;
    push?: boolean;
  };
  isActive?: boolean;
}

export class NotificationQueryDto {
  status?: DeliveryStatus;
  eventType?: NotificationEventType;
  limit?: number;
  offset?: number;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly subscriptionService: NotificationSubscriptionService,
    private readonly eventService: NotificationEventService,
  ) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Subscribe to notifications',
    description: 'Subscribe to specific notification events for real-time updates',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully subscribed to notifications',
  })
  @ApiResponse({
    status: 409,
    description: 'Subscription already exists',
  })
  @ApiBody({
    type: SubscribeDto,
    examples: {
      courseSubscription: {
        summary: 'Subscribe to course lessons',
        value: {
          eventType: 'COURSE_LESSON_PUBLISHED',
          scope: 'COURSE',
          scopeId: 'course-uuid-123',
          preferences: {
            realtime: true,
            email: false,
            push: false,
          },
        },
      },
      userSubscription: {
        summary: 'Subscribe to quiz grades',
        value: {
          eventType: 'QUIZ_GRADED',
          scope: 'USER',
          preferences: {
            realtime: true,
            email: true,
            push: true,
          },
        },
      },
    },
  })
  async subscribe(
    @CurrentUser() user: any,
    @Body() subscribeDto: SubscribeDto,
  ) {
    try {
      const subscription = await this.subscriptionService.subscribe({
        userId: user.id,
        eventType: subscribeDto.eventType,
        scope: subscribeDto.scope,
        scopeId: subscribeDto.scopeId,
        preferences: subscribeDto.preferences,
      });

      return {
        success: true,
        message: 'Successfully subscribed to notifications',
        subscription: {
          id: subscription.id,
          eventType: subscription.eventType,
          scope: subscription.scope,
          scopeId: subscription.scopeId,
          preferences: subscription.preferences,
          createdAt: subscription.createdAt,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete('unsubscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unsubscribe from notifications',
    description: 'Remove subscription to specific notification events',
  })
  @ApiResponse({
    status: 204,
    description: 'Successfully unsubscribed from notifications',
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription not found',
  })
  @ApiBody({
    type: UnsubscribeDto,
    examples: {
      courseUnsubscription: {
        summary: 'Unsubscribe from course lessons',
        value: {
          eventType: 'COURSE_LESSON_PUBLISHED',
          scope: 'COURSE',
          scopeId: 'course-uuid-123',
        },
      },
    },
  })
  async unsubscribe(
    @CurrentUser() user: any,
    @Body() unsubscribeDto: UnsubscribeDto,
  ) {
    await this.subscriptionService.unsubscribe(
      user.id,
      unsubscribeDto.eventType,
      unsubscribeDto.scope,
      unsubscribeDto.scopeId,
    );
  }

  @Get('subscriptions')
  @ApiOperation({
    summary: 'Get user subscriptions',
    description: 'Retrieve all active notification subscriptions for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved subscriptions',
  })
  async getUserSubscriptions(@CurrentUser() user: any) {
    const subscriptions = await this.subscriptionService.getUserSubscriptions(user.id);

    return {
      success: true,
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        eventType: sub.eventType,
        scope: sub.scope,
        scopeId: sub.scopeId,
        preferences: sub.preferences,
        isActive: sub.isActive,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      })),
      total: subscriptions.length,
    };
  }

  @Patch('subscriptions/:subscriptionId')
  @ApiOperation({
    summary: 'Update subscription preferences',
    description: 'Update notification preferences or activate/deactivate a subscription',
  })
  @ApiParam({
    name: 'subscriptionId',
    description: 'UUID of the subscription to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully updated subscription',
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription not found',
  })
  async updateSubscription(
    @CurrentUser() user: any,
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @Body() updateDto: UpdatePreferencesDto,
  ) {
    const subscription = await this.subscriptionService.updateSubscription(
      subscriptionId,
      user.id,
      updateDto,
    );

    return {
      success: true,
      message: 'Subscription updated successfully',
      subscription: {
        id: subscription.id,
        eventType: subscription.eventType,
        scope: subscription.scope,
        scopeId: subscription.scopeId,
        preferences: subscription.preferences,
        isActive: subscription.isActive,
        updatedAt: subscription.updatedAt,
      },
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get notifications',
    description: 'Retrieve notifications for the current user with optional filtering',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DeliveryStatus,
    description: 'Filter by delivery status',
  })
  @ApiQuery({
    name: 'eventType',
    required: false,
    enum: NotificationEventType,
    description: 'Filter by event type',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of notifications to return (max 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of notifications to skip',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved notifications',
  })
  async getUserNotifications(
    @CurrentUser() user: any,
    @Query() query: NotificationQueryDto,
  ) {
    // Validate and set defaults
    const limit = Math.min(query.limit || 20, 50);
    const offset = query.offset || 0;

    const { notifications, total } = await this.notificationsService.getUserNotifications({
      userId: user.id,
      status: query.status,
      eventType: query.eventType,
      limit,
      offset,
    });

    return {
      success: true,
      notifications: notifications.map(notification => ({
        id: notification.id,
        eventType: notification.eventType,
        scope: notification.scope,
        scopeId: notification.scopeId,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        status: notification.status,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  @Get('count/unread')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Get the number of unread notifications for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved unread count',
  })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationsService.getUnreadCount(user.id);

    return {
      success: true,
      unreadCount: count,
    };
  }

  @Patch(':notificationId/read')
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a specific notification as read',
  })
  @ApiParam({
    name: 'notificationId',
    description: 'UUID of the notification to mark as read',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully marked notification as read',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  async markAsRead(
    @CurrentUser() user: any,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ) {
    const notification = await this.notificationsService.markAsRead(notificationId, user.id);

    return {
      success: true,
      message: 'Notification marked as read',
      notification: {
        id: notification.id,
        status: notification.status,
        readAt: notification.readAt,
      },
    };
  }

  @Patch('read/all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all unread notifications as read for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully marked all notifications as read',
  })
  async markAllAsRead(@CurrentUser() user: any) {
    await this.notificationsService.markAllAsRead(user.id);

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  @Delete(':notificationId')
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Delete a specific notification',
  })
  @ApiParam({
    name: 'notificationId',
    description: 'UUID of the notification to delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully deleted notification',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  async deleteNotification(
    @CurrentUser() user: any,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ) {
    await this.notificationsService.deleteNotification(notificationId, user.id);

    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Get notification analytics',
    description: 'Get notification analytics for the current user',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include in analytics (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved notification analytics',
  })
  async getAnalytics(
    @CurrentUser() user: any,
    @Query('days') days?: number,
  ) {
    const daysToAnalyze = days || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysToAnalyze);

    const [analytics, engagement] = await Promise.all([
      this.eventService.getAnalytics(startDate, endDate, user.id),
      this.eventService.getUserEngagementMetrics(user.id, daysToAnalyze),
    ]);

    return {
      success: true,
      analytics: {
        ...analytics,
        engagement,
      },
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Get notification system health',
    description: 'Get health metrics for the notification system',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved health metrics',
  })
  async getHealth() {
    const healthMetrics = await this.eventService.getDeliveryHealthMetrics();

    return {
      success: true,
      health: healthMetrics,
      status: healthMetrics.healthScore > 80 ? 'healthy' : 
              healthMetrics.healthScore > 60 ? 'warning' : 'critical',
    };
  }
}

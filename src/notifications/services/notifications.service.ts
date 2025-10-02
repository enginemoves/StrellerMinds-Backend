import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEvent, DeliveryStatus } from '../entities/notification-event.entity';
import {
  NotificationSubscription,
  NotificationEventType,
  SubscriptionScope,
} from '../entities/notification-subscription.entity';
import { UsersService } from '../../users/services/users.service';

export interface CreateNotificationDto {
  userId: string;
  eventType: NotificationEventType;
  scope: SubscriptionScope;
  scopeId?: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface NotificationQuery {
  userId: string;
  status?: DeliveryStatus;
  eventType?: NotificationEventType;
  limit?: number;
  offset?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEvent)
    private readonly notificationEventRepository: Repository<NotificationEvent>,
    @InjectRepository(NotificationSubscription)
    private readonly subscriptionRepository: Repository<NotificationSubscription>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new notification event
   */
  async create(dto: CreateNotificationDto): Promise<NotificationEvent> {
    try {
      // Verify user exists
      const user = await this.usersService.findOne(dto.userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }

      const notification = this.notificationEventRepository.create({
        userId: dto.userId,
        eventType: dto.eventType,
        scope: dto.scope,
        scopeId: dto.scopeId,
        title: dto.title,
        message: dto.message,
        data: dto.data,
        status: DeliveryStatus.DELIVERED, // Mark as delivered since we're using WebSocket
        deliveryChannels: {
          realtime: true,
          email: false,
          push: false,
        },
      });

      const savedNotification = await this.notificationEventRepository.save(notification);

      this.logger.debug(
        `Created notification ${savedNotification.id} for user ${dto.userId}`,
      );

      // Emit event for potential additional processing
      this.eventEmitter.emit('notification.created', {
        notification: savedNotification,
        userId: dto.userId,
      });

      return savedNotification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notifications for a user with pagination
   */
  async getUserNotifications(query: NotificationQuery): Promise<{
    notifications: NotificationEvent[];
    total: number;
  }> {
    try {
      const { userId, status, eventType, limit = 20, offset = 0 } = query;

      const queryBuilder = this.notificationEventRepository
        .createQueryBuilder('notification')
        .where('notification.userId = :userId', { userId })
        .orderBy('notification.createdAt', 'DESC')
        .limit(limit)
        .offset(offset);

      if (status) {
        queryBuilder.andWhere('notification.status = :status', { status });
      }

      if (eventType) {
        queryBuilder.andWhere('notification.eventType = :eventType', { eventType });
      }

      const [notifications, total] = await queryBuilder.getManyAndCount();

      return { notifications, total };
    } catch (error) {
      this.logger.error(`Failed to get user notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.notificationEventRepository.count({
        where: {
          userId,
          status: DeliveryStatus.DELIVERED,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get unread count: ${error.message}`);
      return 0;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<NotificationEvent> {
    try {
      const notification = await this.notificationEventRepository.findOne({
        where: {
          id: notificationId,
          userId,
        },
      });

      if (!notification) {
        throw new NotFoundException(
          `Notification ${notificationId} not found for user ${userId}`,
        );
      }

      if (notification.status === DeliveryStatus.READ) {
        return notification; // Already read
      }

      notification.status = DeliveryStatus.READ;
      notification.readAt = new Date();

      const updatedNotification = await this.notificationEventRepository.save(notification);

      this.logger.debug(
        `Marked notification ${notificationId} as read for user ${userId}`,
      );

      // Emit event for analytics or additional processing
      this.eventEmitter.emit('notification.read', {
        notification: updatedNotification,
        userId,
      });

      return updatedNotification;
    } catch (error) {
      this.logger.error(`Failed to mark notification as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await this.notificationEventRepository.update(
        {
          userId,
          status: DeliveryStatus.DELIVERED,
        },
        {
          status: DeliveryStatus.READ,
          readAt: new Date(),
        },
      );

      this.logger.debug(`Marked all notifications as read for user ${userId}`);

      this.eventEmitter.emit('notification.all_read', { userId });
    } catch (error) {
      this.logger.error(`Failed to mark all notifications as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const result = await this.notificationEventRepository.delete({
        id: notificationId,
        userId,
      });

      if (result.affected === 0) {
        throw new NotFoundException(
          `Notification ${notificationId} not found for user ${userId}`,
        );
      }

      this.logger.debug(
        `Deleted notification ${notificationId} for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to delete notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notification statistics for analytics
   */
  async getNotificationStats(userId?: string): Promise<{
    totalSent: number;
    totalRead: number;
    readRate: number;
    byEventType: Record<string, number>;
  }> {
    try {
      const queryBuilder = this.notificationEventRepository.createQueryBuilder('notification');

      if (userId) {
        queryBuilder.where('notification.userId = :userId', { userId });
      }

      const totalSent = await queryBuilder.getCount();
      
      const totalRead = await queryBuilder
        .clone()
        .andWhere('notification.status = :status', { status: DeliveryStatus.READ })
        .getCount();

      const readRate = totalSent > 0 ? (totalRead / totalSent) * 100 : 0;

      // Get counts by event type
      const eventTypeCounts = await queryBuilder
        .clone()
        .select(['notification.eventType', 'COUNT(*) as count'])
        .groupBy('notification.eventType')
        .getRawMany();

      const byEventType = eventTypeCounts.reduce((acc, item) => {
        acc[item.notification_eventType] = parseInt(item.count);
        return acc;
      }, {});

      return {
        totalSent,
        totalRead,
        readRate: Math.round(readRate * 100) / 100,
        byEventType,
      };
    } catch (error) {
      this.logger.error(`Failed to get notification stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up old notifications (for maintenance)
   */
  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.notificationEventRepository.delete({
        createdAt: { $lt: cutoffDate } as any,
        status: DeliveryStatus.READ,
      });

      const deletedCount = result.affected || 0;

      this.logger.log(
        `Cleaned up ${deletedCount} old notifications older than ${daysOld} days`,
      );

      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to cleanup old notifications: ${error.message}`);
      throw error;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEvent, DeliveryStatus } from '../entities/notification-event.entity';
import { NotificationEventType, SubscriptionScope } from '../entities/notification-subscription.entity';

export interface NotificationAnalytics {
  totalNotifications: number;
  deliveredCount: number;
  readCount: number;
  deliveryRate: number;
  readRate: number;
  averageReadTime?: number;
  eventTypeBreakdown: Record<string, number>;
  scopeBreakdown: Record<string, number>;
  dailyStats?: Array<{
    date: string;
    sent: number;
    read: number;
  }>;
}

@Injectable()
export class NotificationEventService {
  private readonly logger = new Logger(NotificationEventService.name);

  constructor(
    @InjectRepository(NotificationEvent)
    private readonly notificationEventRepository: Repository<NotificationEvent>,
  ) {}

  /**
   * Get comprehensive notification analytics
   */
  async getAnalytics(
    startDate?: Date,
    endDate?: Date,
    userId?: string,
    eventType?: NotificationEventType,
  ): Promise<NotificationAnalytics> {
    try {
      const queryBuilder = this.notificationEventRepository.createQueryBuilder('notification');

      if (startDate && endDate) {
        queryBuilder.andWhere(
          'notification.createdAt >= :startDate AND notification.createdAt <= :endDate',
          { startDate, endDate },
        );
      }

      if (userId) {
        queryBuilder.andWhere('notification.userId = :userId', { userId });
      }

      if (eventType) {
        queryBuilder.andWhere('notification.eventType = :eventType', { eventType });
      }

      // Get total counts
      const totalNotifications = await queryBuilder.getCount();

      const deliveredCount = await queryBuilder
        .clone()
        .andWhere('notification.status IN (:...statuses)', {
          statuses: [DeliveryStatus.DELIVERED, DeliveryStatus.READ],
        })
        .getCount();

      const readCount = await queryBuilder
        .clone()
        .andWhere('notification.status = :status', { status: DeliveryStatus.READ })
        .getCount();

      const deliveryRate = totalNotifications > 0 ? (deliveredCount / totalNotifications) * 100 : 0;
      const readRate = deliveredCount > 0 ? (readCount / deliveredCount) * 100 : 0;

      // Get event type breakdown
      const eventTypeCounts = await queryBuilder
        .clone()
        .select(['notification.eventType', 'COUNT(*) as count'])
        .groupBy('notification.eventType')
        .getRawMany();

      const eventTypeBreakdown = eventTypeCounts.reduce((acc, item) => {
        acc[item.notification_eventType] = parseInt(item.count);
        return acc;
      }, {});

      // Get scope breakdown
      const scopeCounts = await queryBuilder
        .clone()
        .select(['notification.scope', 'COUNT(*) as count'])
        .groupBy('notification.scope')
        .getRawMany();

      const scopeBreakdown = scopeCounts.reduce((acc, item) => {
        acc[item.notification_scope] = parseInt(item.count);
        return acc;
      }, {});

      // Calculate average read time (if applicable)
      let averageReadTime: number | undefined;
      if (readCount > 0) {
        const readTimeQuery = await queryBuilder
          .clone()
          .select([
            'AVG(EXTRACT(EPOCH FROM (notification.readAt - notification.createdAt))) as avgReadTime',
          ])
          .andWhere('notification.status = :status AND notification.readAt IS NOT NULL', {
            status: DeliveryStatus.READ,
          })
          .getRawOne();

        averageReadTime = readTimeQuery?.avgReadTime
          ? parseFloat(readTimeQuery.avgReadTime)
          : undefined;
      }

      // Get daily stats if date range is provided
      let dailyStats: Array<{ date: string; sent: number; read: number }> | undefined;
      if (startDate && endDate) {
        const dailyStatsQuery = await this.notificationEventRepository
          .createQueryBuilder('notification')
          .select([
            'DATE(notification.createdAt) as date',
            'COUNT(*) as sent',
            'SUM(CASE WHEN notification.status = :readStatus THEN 1 ELSE 0 END) as read',
          ])
          .where(
            'notification.createdAt >= :startDate AND notification.createdAt <= :endDate',
            { startDate, endDate, readStatus: DeliveryStatus.READ },
          )
          .groupBy('DATE(notification.createdAt)')
          .orderBy('DATE(notification.createdAt)', 'ASC')
          .getRawMany();

        dailyStats = dailyStatsQuery.map(item => ({
          date: item.date,
          sent: parseInt(item.sent),
          read: parseInt(item.read || 0),
        }));
      }

      return {
        totalNotifications,
        deliveredCount,
        readCount,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        readRate: Math.round(readRate * 100) / 100,
        averageReadTime,
        eventTypeBreakdown,
        scopeBreakdown,
        dailyStats,
      };
    } catch (error) {
      this.logger.error(`Failed to get notification analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(userId: string, days: number = 30): Promise<{
    totalReceived: number;
    totalRead: number;
    engagementRate: number;
    averageResponseTime: number;
    preferredEventTypes: string[];
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const queryBuilder = this.notificationEventRepository
        .createQueryBuilder('notification')
        .where('notification.userId = :userId', { userId })
        .andWhere('notification.createdAt >= :startDate', { startDate });

      const totalReceived = await queryBuilder.getCount();

      const totalRead = await queryBuilder
        .clone()
        .andWhere('notification.status = :status', { status: DeliveryStatus.READ })
        .getCount();

      const engagementRate = totalReceived > 0 ? (totalRead / totalReceived) * 100 : 0;

      // Calculate average response time
      const avgResponseTimeQuery = await queryBuilder
        .clone()
        .select([
          'AVG(EXTRACT(EPOCH FROM (notification.readAt - notification.createdAt))) as avgTime',
        ])
        .andWhere('notification.status = :status AND notification.readAt IS NOT NULL', {
          status: DeliveryStatus.READ,
        })
        .getRawOne();

      const averageResponseTime = avgResponseTimeQuery?.avgTime
        ? parseFloat(avgResponseTimeQuery.avgTime)
        : 0;

      // Get preferred event types (most read)
      const eventTypeEngagement = await queryBuilder
        .clone()
        .select([
          'notification.eventType',
          'COUNT(*) as total',
          'SUM(CASE WHEN notification.status = :readStatus THEN 1 ELSE 0 END) as read',
        ])
        .groupBy('notification.eventType')
        .having('COUNT(*) > 0')
        .setParameter('readStatus', DeliveryStatus.READ)
        .getRawMany();

      const preferredEventTypes = eventTypeEngagement
        .map(item => ({
          eventType: item.notification_eventType,
          engagementRate: parseInt(item.total) > 0 ? (parseInt(item.read || 0) / parseInt(item.total)) * 100 : 0,
        }))
        .sort((a, b) => b.engagementRate - a.engagementRate)
        .slice(0, 3)
        .map(item => item.eventType);

      return {
        totalReceived,
        totalRead,
        engagementRate: Math.round(engagementRate * 100) / 100,
        averageResponseTime,
        preferredEventTypes,
      };
    } catch (error) {
      this.logger.error(`Failed to get user engagement metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get course notification performance
   */
  async getCourseNotificationPerformance(courseId: string): Promise<{
    totalNotifications: number;
    uniqueRecipients: number;
    averageEngagementRate: number;
    topPerformingEventTypes: Array<{
      eventType: string;
      count: number;
      readRate: number;
    }>;
  }> {
    try {
      const queryBuilder = this.notificationEventRepository
        .createQueryBuilder('notification')
        .where('notification.scope = :scope', { scope: SubscriptionScope.COURSE })
        .andWhere('notification.scopeId = :courseId', { courseId });

      const totalNotifications = await queryBuilder.getCount();

      const uniqueRecipientsQuery = await queryBuilder
        .clone()
        .select('COUNT(DISTINCT notification.userId) as count')
        .getRawOne();

      const uniqueRecipients = parseInt(uniqueRecipientsQuery?.count || 0);

      // Calculate average engagement rate
      const engagementQuery = await queryBuilder
        .clone()
        .select([
          'COUNT(*) as total',
          'SUM(CASE WHEN notification.status = :readStatus THEN 1 ELSE 0 END) as read',
        ])
        .setParameter('readStatus', DeliveryStatus.READ)
        .getRawOne();

      const totalSent = parseInt(engagementQuery?.total || 0);
      const totalRead = parseInt(engagementQuery?.read || 0);
      const averageEngagementRate = totalSent > 0 ? (totalRead / totalSent) * 100 : 0;

      // Get top performing event types
      const eventTypePerformance = await queryBuilder
        .clone()
        .select([
          'notification.eventType',
          'COUNT(*) as count',
          'SUM(CASE WHEN notification.status = :readStatus THEN 1 ELSE 0 END) as read',
        ])
        .groupBy('notification.eventType')
        .setParameter('readStatus', DeliveryStatus.READ)
        .getRawMany();

      const topPerformingEventTypes = eventTypePerformance
        .map(item => ({
          eventType: item.notification_eventType,
          count: parseInt(item.count),
          readRate: parseInt(item.count) > 0 ? (parseInt(item.read || 0) / parseInt(item.count)) * 100 : 0,
        }))
        .sort((a, b) => b.readRate - a.readRate);

      return {
        totalNotifications,
        uniqueRecipients,
        averageEngagementRate: Math.round(averageEngagementRate * 100) / 100,
        topPerformingEventTypes,
      };
    } catch (error) {
      this.logger.error(`Failed to get course notification performance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up processed notifications older than specified days
   */
  async cleanupProcessedNotifications(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.notificationEventRepository
        .createQueryBuilder()
        .delete()
        .from(NotificationEvent)
        .where('createdAt < :cutoffDate', { cutoffDate })
        .andWhere('status = :status', { status: DeliveryStatus.READ })
        .execute();

      const deletedCount = result.affected || 0;

      this.logger.log(
        `Cleaned up ${deletedCount} processed notifications older than ${daysOld} days`,
      );

      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to cleanup processed notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notification delivery health metrics
   */
  async getDeliveryHealthMetrics(): Promise<{
    totalPending: number;
    totalFailed: number;
    averageDeliveryTime: number;
    failureRate: number;
    healthScore: number;
  }> {
    try {
      const totalPending = await this.notificationEventRepository.count({
        where: { status: DeliveryStatus.PENDING },
      });

      const totalFailed = await this.notificationEventRepository.count({
        where: { status: DeliveryStatus.FAILED },
      });

      const totalProcessed = await this.notificationEventRepository.count({
        where: { status: DeliveryStatus.DELIVERED },
      });

      const failureRate = totalProcessed + totalFailed > 0
        ? (totalFailed / (totalProcessed + totalFailed)) * 100
        : 0;

      // Calculate average delivery time (assuming immediate delivery for WebSocket)
      const averageDeliveryTime = 0.1; // 100ms average for WebSocket

      // Calculate health score (0-100)
      const healthScore = Math.max(0, 100 - (failureRate * 2) - (totalPending * 0.1));

      return {
        totalPending,
        totalFailed,
        averageDeliveryTime,
        failureRate: Math.round(failureRate * 100) / 100,
        healthScore: Math.round(healthScore * 100) / 100,
      };
    } catch (error) {
      this.logger.error(`Failed to get delivery health metrics: ${error.message}`);
      throw error;
    }
  }
}

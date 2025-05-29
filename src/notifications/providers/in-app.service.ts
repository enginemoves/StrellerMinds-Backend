import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationStatus,
  NotificationType,
  NotificationPriority,
} from '../entities/notification.entity';

@Injectable()
export class InAppService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async sendInAppNotification(
    userId: string,
    payload: {
      title: string;
      content: string;
      category: string;
      priority?: NotificationPriority;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    const notification = this.notificationRepo.create({
      userId,
      title: payload.title,
      content: payload.content,
      category: payload.category,
      priority: payload.priority || NotificationPriority.MEDIUM,
      types: [NotificationType.IN_APP],
      status: NotificationStatus.UNREAD,
      metadata: payload.metadata || {},
      isDelivered: true, // assuming immediate delivery
      deliveredAt: new Date(),
    });

    await this.notificationRepo.save(notification);
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationRepo.update(notificationId, {
      status: NotificationStatus.READ,
      readAt: new Date(),
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationsRepository.create(dto);
    return this.notificationsRepository.save(notification);
  }

  async findAll(): Promise<Notification[]> {
    return this.notificationsRepository.find();
  }

  async findOne(id: string): Promise<Notification> {
    return this.notificationsRepository.findOneBy({ id });
  }

  async update(id: string, dto: Partial<CreateNotificationDto>): Promise<Notification> {
    await this.notificationsRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.notificationsRepository.delete(id);
  }

  async notifyUser(userId: string, message: string): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      title: 'New Feedback',
      message,
      isRead: false,
      recipientId: userId
    });

    return this.notificationsRepository.save(notification);
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOneBy({ id });
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    notification.isRead = true;
    return this.notificationsRepository.save(notification);
  }
}

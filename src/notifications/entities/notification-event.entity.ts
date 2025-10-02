import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { NotificationEventType, SubscriptionScope } from './notification-subscription.entity';

export enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  READ = 'READ',
}

@Entity('notification_events')
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['userId', 'status'])
export class NotificationEvent {
  @ApiProperty({ description: 'Notification event ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID who received the notification' })
  @Column('uuid')
  @Index()
  userId: string;

  @ApiProperty({ description: 'Event type', enum: NotificationEventType })
  @Column({ type: 'enum', enum: NotificationEventType })
  @Index()
  eventType: NotificationEventType;

  @ApiProperty({ description: 'Notification scope', enum: SubscriptionScope })
  @Column({ type: 'enum', enum: SubscriptionScope })
  scope: SubscriptionScope;

  @ApiProperty({ description: 'Scope identifier' })
  @Column({ nullable: true })
  scopeId?: string;

  @ApiProperty({ description: 'Notification title' })
  @Column()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @Column({ type: 'text' })
  message: string;

  @ApiProperty({ description: 'Notification data (JSON)' })
  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, any>;

  @ApiProperty({ description: 'Delivery status', enum: DeliveryStatus })
  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  status: DeliveryStatus;

  @ApiProperty({ description: 'Delivery channels used' })
  @Column({ type: 'jsonb', nullable: true })
  deliveryChannels?: {
    realtime?: boolean;
    email?: boolean;
    push?: boolean;
  };

  @ApiProperty({ description: 'Date read (if applicable)' })
  @Column({ nullable: true })
  readAt?: Date;

  @ApiProperty({ description: 'Date created' })
  @CreateDateColumn()
  @Index()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

export enum NotificationEventType {
  COURSE_ENROLLMENT = 'COURSE_ENROLLMENT',
  COURSE_LESSON_PUBLISHED = 'COURSE_LESSON_PUBLISHED',
  QUIZ_GRADED = 'QUIZ_GRADED',
  LIVE_SESSION_STARTING = 'LIVE_SESSION_STARTING',
}

export enum SubscriptionScope {
  USER = 'USER',       
  COURSE = 'COURSE',  
  GLOBAL = 'GLOBAL',   
}

@Entity('notification_subscriptions')
@Unique(['userId', 'eventType', 'scope', 'scopeId'])
export class NotificationSubscription {
  @ApiProperty({ description: 'Subscription ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID who subscribed' })
  @Column('uuid')
  @Index()
  userId: string;

  @ApiProperty({ description: 'Event type to subscribe to', enum: NotificationEventType })
  @Column({ type: 'enum', enum: NotificationEventType })
  @Index()
  eventType: NotificationEventType;

  @ApiProperty({ description: 'Subscription scope', enum: SubscriptionScope })
  @Column({ type: 'enum', enum: SubscriptionScope })
  @Index()
  scope: SubscriptionScope;

  @ApiProperty({ description: 'Scope identifier (e.g., course ID for course-specific subscriptions)' })
  @Column({ nullable: true })
  @Index()
  scopeId?: string;

  @ApiProperty({ description: 'Whether the subscription is active' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Subscription preferences (JSON)' })
  @Column({ type: 'jsonb', nullable: true })
  preferences?: {
    realtime?: boolean;
    email?: boolean;
    push?: boolean;
  };

  @ApiProperty({ description: 'Date created' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Date updated' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}

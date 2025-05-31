import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm"
import { User } from "../../users/entities/user.entity"

export enum NotificationType {
  IN_APP = "in_app",
  EMAIL = "email",
  PUSH = "push",
}

export enum NotificationStatus {
  UNREAD = "unread",
  READ = "read",
}

export enum NotificationPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

@Entity("notifications")
@Index(["userId", "createdAt"])
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ name: "user_id" })
  userId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User

  @Column({ type: "varchar", length: 255 })
  title: string

  @Column({ type: "text" })
  content: string

  @Column({
    type: "enum",
    enum: NotificationType,
    array: true,
    default: [NotificationType.IN_APP],
  })
  types: NotificationType[]

  @Column({
    type: "enum",
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
  })
  status: NotificationStatus

  @Column({
    type: "enum",
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority

  @Column({ type: "varchar", length: 100 })
  category: string

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "boolean", default: false })
  isDelivered: boolean

  @Column({ type: "timestamp", nullable: true })
  readAt: Date

  @Column({ type: "timestamp", nullable: true })
  deliveredAt: Date

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date
}


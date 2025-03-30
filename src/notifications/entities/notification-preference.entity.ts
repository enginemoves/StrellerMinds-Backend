import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm"
import { User } from "../../users/entities/user.entity"
import { NotificationType } from "./notification.entity"

@Entity("notification_preferences")
@Unique(["userId", "category"])
export class NotificationPreference {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ name: "user_id" })
  userId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User

  @Column({ type: "varchar", length: 100 })
  @Index()
  category: string

  @Column({
    type: "enum",
    enum: NotificationType,
    array: true,
    default: [NotificationType.IN_APP, NotificationType.EMAIL, NotificationType.PUSH],
  })
  enabledTypes: NotificationType[]

  @Column({ type: "boolean", default: true })
  enabled: boolean

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date
}


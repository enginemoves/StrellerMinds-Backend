import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { NotificationType } from "./notification.entity"

@Entity("notification_templates")
export class NotificationTemplate {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 100, unique: true })
  code: string

  @Column({ type: "varchar", length: 255 })
  name: string

  @Column({ type: "text" })
  titleTemplate: string

  @Column({ type: "text" })
  contentTemplate: string

  @Column({ type: "enum", enum: NotificationType, array: true })
  supportedTypes: NotificationType[]

  @Column({ type: "varchar", length: 100 })
  category: string

  @Column({ type: "jsonb", nullable: true })
  defaultMetadata: Record<string, any>

  @Column({ type: "boolean", default: true })
  isActive: boolean

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date
}


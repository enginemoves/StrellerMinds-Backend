import { User } from "../../users/entities/user.entity"
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn, UpdateDateColumn } from "typeorm"


@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  title: string

  @Column('text')
  message: string

  @Column({ default: false })
  isRead: boolean

  @Column()
  type: string // course_update, forum_reply, payment, etc.

  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Many-to-One relationship
  @ManyToOne(
    () => User,
    (user) => user.id,
    { nullable: false },
  )
  @Index()
  user: User

  @Column()
  recipientId: string;

}


import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from "typeorm"
import { User } from "../../users/entities/user.entity"
import { Course } from "../../courses/entities/course.entity"

export enum EngagementType {
  LOGIN = "login",
  COURSE_VIEW = "course_view",
  LESSON_START = "lesson_start",
  LESSON_COMPLETE = "lesson_complete",
  QUIZ_ATTEMPT = "quiz_attempt",
  FORUM_POST = "forum_post",
  DOWNLOAD = "download",
}

@Entity("user_engagements")
@Index(["userId", "createdAt"])
@Index(["courseId", "createdAt"])
@Index(["engagementType", "createdAt"])
export class UserEngagement {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "uuid", nullable: true })
  courseId?: string

  @Column({
    type: "enum",
    enum: EngagementType,
  })
  engagementType: EngagementType

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "integer", default: 1 })
  duration: number // in seconds

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User)
  user: User

  @ManyToOne(() => Course, { nullable: true })
  course?: Course
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from "typeorm"
import { User } from "../../users/entities/user.entity"
import { Course } from "../../courses/entities/course.entity"

export enum CompletionStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  DROPPED = "dropped",
}

@Entity("course_completions")
@Unique(["userId", "courseId"])
@Index(["courseId", "status"])
@Index(["completedAt"])
export class CourseCompletion {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "uuid" })
  courseId: string

  @Column({
    type: "enum",
    enum: CompletionStatus,
    default: CompletionStatus.NOT_STARTED,
  })
  status: CompletionStatus

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  progressPercentage: number

  @Column({ type: "integer", default: 0 })
  lessonsCompleted: number

  @Column({ type: "integer", default: 0 })
  totalLessons: number

  @Column({ type: "integer", default: 0 })
  timeSpent: number // in minutes

  @Column({ type: "timestamp", nullable: true })
  startedAt?: Date

  @Column({ type: "timestamp", nullable: true })
  completedAt?: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => User)
  user: User

  @ManyToOne(() => Course)
  course: Course
}

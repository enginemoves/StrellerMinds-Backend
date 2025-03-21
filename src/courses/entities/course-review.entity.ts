import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { Course } from "./course.entity"
import { User } from "src/users/entities/user.entity"

@Entity("course_reviews")
export class CourseReview {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "int", default: 5 })
  rating: number

  @Column({ type: "text", nullable: true })
  comment: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Many-to-One relationships
  @ManyToOne(
    () => User,
    (user) => user.reviews,
    { nullable: false },
  )
  @Index()
  user: User

  @ManyToOne(
    () => Course,
    (course) => course.reviews,
    { nullable: false, onDelete: "CASCADE" },
  )
  @Index()
  course: Course
}


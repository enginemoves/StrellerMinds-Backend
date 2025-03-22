import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm"
import { Category } from "./category.entity"
import { Tag } from "./tag.entity"
import { CourseReview } from "./course-review.entity"
import { User } from "src/users/entities/user.entity"
import { Module } from "src/module/entities/module.entity"
import { Certificate } from "src/certificate/entity/certificate.entity"
import { Payment } from "src/payment/entities/payment.entity"
import { UserProgress } from "src/users/entities/user-progress.entity"


@Entity("courses")
export class Course {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ length: 255 })
  title: string

  @Column({ type: "text" })
  description: string

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  price: number

  @Column({ default: 0 })
  durationInHours: number

  @Column({ default: "draft" })
  status: string // draft, published, archived

  @Column({ nullable: true })
  thumbnail: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Many-to-One relationships
  @ManyToOne(
    () => User,
    (user) => user.instructorCourses,
    { nullable: false },
  )
  @Index()
  instructor: User

  @ManyToOne(
    () => Category,
    (category) => category.courses,
    { nullable: false },
  )
  @Index()
  category: Category

  // One-to-Many relationships
  @OneToMany(
    () => Module,
    (module) => module.course,
    { cascade: true },
  )
  modules: Module[]

  @OneToMany(
    () => Certificate,
    (certificate) => certificate.course,
  )
  certificates: Certificate[]

  @OneToMany(
    () => CourseReview,
    (review) => review.course,
  )
  reviews: CourseReview[]

  @OneToMany(
    () => Payment,
    (payment) => payment.course,
  )
  payments: Payment[]

  @OneToMany(
    () => UserProgress,
    (progress) => progress.course,
  )
  userProgress: UserProgress[]

  // Many-to-Many relationship
  @ManyToMany(
    () => Tag,
    (tag) => tag.courses,
  )
  @JoinTable({
    name: "course_tags",
    joinColumn: { name: "course_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "tag_id", referencedColumnName: "id" },
  })
  tags: Tag[]
}


import { Course } from "src/courses/entities/course.entity"
import { User } from "src/users/entities/user.entity"
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn } from "typeorm"


@Entity("certificates")
export class Certificate {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ unique: true })
  certificateNumber: string

  @Column()
  issueDate: Date

  @Column({ nullable: true })
  pdfUrl: string

  @CreateDateColumn()
  createdAt: Date

  // Many-to-One relationships
  @ManyToOne(
    () => User,
    (user) => user.certificates,
    { nullable: false },
  )
  @Index()
  user: User

  @ManyToOne(
    () => Course,
    (course) => course.certificates,
    { nullable: false },
  )
  @Index()
  course: Course
}


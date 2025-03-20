import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"

@Entity("courses")
export class Course {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  title: string

  @Column({ type: "text" })
  description: string

  @Column({ nullable: true })
  thumbnail: string

  @Column({ nullable: true })
  introVideo: string

  @Column({ type: "float", nullable: true })
  price: number

  @Column({ default: "XLM" })
  currency: string

  @Column({ default: false })
  isFeatured: boolean

  @Column({ default: false })
  isPublished: boolean

  @Column({ default: 0 })
  enrollmentCount: number

  @Column({ type: "float", default: 0 })
  averageRating: number

  @Column({ default: 0 })
  reviewCount: number

  @Column({ nullable: true })
  duration: string

  @Column({ nullable: true })
  level: string

  @Column({ type: "jsonb", nullable: true })
  requirements: string[]

  @Column({ type: "jsonb", nullable: true })
  learningOutcomes: string[]

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column()
  instructorId: string

  @Column({ nullable: true })
  categoryId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
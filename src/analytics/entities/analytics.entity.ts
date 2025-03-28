import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('analytics')
export class Analytics {
  @PrimaryGeneratedColumn()
  id: number;

  @Index() // Optimized for querying analytics by event type
  @Column()
  eventType: string; // e.g., "course_view", "lesson_completed"

  @Index() // Indexing improves search performance for user-based analytics
  @Column()
  userId: number;

  @Column({ nullable: true })
  courseId?: number; // Optional for course-related events

  @Column({ type: 'json', nullable: true })
  additionalData?: Record<string, any>; // Properly stored as JSON

  @CreateDateColumn()
  createdAt: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from '../../lesson/entity/lesson.entity';
import { CourseModule } from '../../courses/entities/course-module.entity';

@Entity('user_progress')
@Index(['user', 'course', 'lesson'], { unique: true }) // Ensure unique progress per user/course/lesson
export class UserProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ type: 'float', default: 0.0 })
  progressPercentage: number;

  @Column({ type: 'jsonb', nullable: true }) // Flexible metadata storage
  metadata: any;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  @ManyToOne(() => User, (user) => user.progress)
  user: User;

  @ManyToOne(() => Course, (course) => course.userProgress)
  course: Course;

  @ManyToOne(() => CourseModule, { nullable: true })
  module: CourseModule;

  @ManyToOne(() => Lesson, { nullable: true }) // Optional relationship
  lesson: Lesson;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
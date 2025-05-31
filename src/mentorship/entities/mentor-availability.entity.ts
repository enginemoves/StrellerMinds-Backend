import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum RecurrenceType {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

@Entity('mentor_availability')
export class MentorAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'mentor_id' })
  mentor: User;

  @Column({ name: 'mentor_id' })
  mentorId: string;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: RecurrenceType,
    default: RecurrenceType.ONCE,
  })
  recurrenceType: RecurrenceType;

  @Column({ type: 'int', nullable: true })
  recurrenceInterval: number;

  @Column({ type: 'timestamp', nullable: true })
  recurrenceEndDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int', default: 60 })
  durationMinutes: number;

  @Column({ type: 'int', default: 1 })
  maxBookingsPerSlot: number;

  @Column({ type: 'json', nullable: true })
  additionalDetails: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

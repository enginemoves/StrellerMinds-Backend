import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Mentorship } from './mentorship.entity';

@Entity('mentorship_sessions')
export class MentorshipSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Mentorship, (mentorship) => mentorship.sessions, { nullable: false })
  mentorship: Mentorship;

  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  @Column({ type: 'int', default: 60 })
  durationMinutes: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: 'scheduled' })
  status: 'scheduled' | 'completed' | 'cancelled';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

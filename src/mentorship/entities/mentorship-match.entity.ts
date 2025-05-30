import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum MatchStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

export enum MatchType {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
}

@Entity('mentorship_matches')
export class MentorshipMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'mentor_id' })
  mentor: User;

  @Column({ name: 'mentor_id' })
  mentorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'mentee_id' })
  mentee: User;

  @Column({ name: 'mentee_id' })
  menteeId: string;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.PENDING,
  })
  status: MatchStatus;

  @Column({
    type: 'enum',
    enum: MatchType,
    default: MatchType.AUTOMATIC,
  })
  matchType: MatchType;

  @Column({ type: 'float', default: 0 })
  compatibilityScore: number;

  @Column({ type: 'json', nullable: true })
  matchDetails: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  mentorFeedback: string;

  @Column({ type: 'text', nullable: true })
  menteeFeedback: string;

  @Column({ type: 'int', nullable: true })
  mentorRating: number;

  @Column({ type: 'int', nullable: true })
  menteeRating: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

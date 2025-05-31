import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum UserRole {
  MENTOR = 'mentor',
  MENTEE = 'mentee',
}

@Entity('mentorship_preferences')
export class MentorshipPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MENTEE,
  })
  role: UserRole;

  @Column('simple-array', { nullable: true })
  skills: string[];

  @Column('simple-array', { nullable: true })
  interests: string[];

  @Column({ type: 'json', nullable: true })
  skillWeights: Record<string, number>;

  @Column({ type: 'json', nullable: true })
  interestWeights: Record<string, number>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'int', default: 0 })
  experienceLevel: number;

  @Column({ nullable: true })
  preferredLanguage: string;

  @Column({ type: 'json', nullable: true })
  additionalPreferences: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

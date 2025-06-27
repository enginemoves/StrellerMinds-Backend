import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MentorshipSession } from './mentorship-session.entity';

@Entity('mentorships')
export class Mentorship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, eager: true })
  mentor: User;

  @ManyToOne(() => User, { nullable: false, eager: true })
  mentee: User;

  @Column({ default: 'active' })
  status: 'active' | 'completed' | 'cancelled';

  @Column({ type: 'text', nullable: true })
  goals: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => MentorshipSession, (session) => session.mentorship)
  sessions: MentorshipSession[];
}

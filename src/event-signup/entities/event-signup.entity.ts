import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  Unique,
} from 'typeorm';
import { Event } from './event.entity';
import { User } from '../../users/entities/user.entity';

export enum SignupStatus {
  CONFIRMED = 'confirmed',
  WAITLISTED = 'waitlisted',
  CANCELLED = 'cancelled',
}

@Entity('event_signups')
@Unique(['userId', 'eventId'])
export class EventSignup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  eventId: string;

  @Column({
    type: 'enum',
    enum: SignupStatus,
    default: SignupStatus.CONFIRMED,
  })
  status: SignupStatus;

  @Column({ type: 'int', nullable: true })
  waitlistPosition: number;

  @Column({ type: 'timestamp', nullable: true })
  signupDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancellationDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Event, (event) => event.signups, { nullable: false })
  @Index()
  event: Event;

  @ManyToOne(() => User, { nullable: false })
  @Index()
  user: User;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { EventSignup } from './event-signup.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column()
  location: string;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'int', default: 0 })
  currentSignups: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  allowWaitlist: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => EventSignup, (signup) => signup.event)
  signups: EventSignup[];
}

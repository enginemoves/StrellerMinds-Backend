/* eslint-disable prettier/prettier */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Topic } from 'src/topic/topic.entity';
import { User } from '../users/entities/user.entity';
import { Reply } from 'src/reply/reply.entity';

@Entity('threads')
export class Thread {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Topic, (topic) => topic.threads)
  topic: Topic;

  @ManyToOne(() => User)
  author: User;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ default: true })
  isOpen: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Reply, (reply: Reply) => reply.thread)
  replies: Reply[];
}

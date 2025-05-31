import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  recipientId: string; 

  @Column({ nullable: true })
  senderId: string | null; 

  @Column('text')
  content: string;

  @Column({ default: false })
  isAnonymous: boolean;

  @Column({ default: false })
  isFlagged: boolean;

  @Column({ type: 'enum', enum: ['general', 'assignment', 'project', 'presentation'], default: 'general' })
  category: string;

  @Column({ type: 'int', nullable: true })
  rating: number;

  @Column({ type: 'text', nullable: true })
  response: string;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  template: {
    name: string;
    fields: { [key: string]: string };
  };

  @Column({ default: 'public' })
  visibility: 'public' | 'private' | 'course';

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;

  @ManyToOne(() => User, { nullable: true })
  sender: User;

  @ManyToOne(() => User)
  recipient: User;
}

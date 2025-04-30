import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Assignment } from '../../assignments/entities/assignment.entity'; // Assuming you have an Assignment entity

@Entity()
export class Grade {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.gradesGiven)
  mentor: User;

  @ManyToOne(() => User, (user) => user.gradesReceived)
  student: User;

  @ManyToOne(() => Assignment)
  assignment: Assignment;

  @Column({ type: 'int' })
  numericGrade: number;

  @Column({ type: 'text' })
  feedback: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// src/users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserProgress } from './user-progress.entity';
import { WalletInfo } from './wallet-info.entity'; // Ensure this import is present
import * as bcrypt from 'bcrypt';
import { UserRole } from '../enums/userRole.enum';
import { AuthToken } from '../../auth/entities/auth-token.entity';
import { Course } from '../../courses/entities/course.entity';
import { CourseReview } from '../../courses/entities/course-review.entity';
import { Certificate } from '../../certificate/entity/certificate.entity';
import { Payment } from '../../payment/entities/payment.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ default: false })
  isInstructor: boolean;

  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({ nullable: true })
  profilePicture: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserProgress, (progress) => progress.user)
  progress: Promise<UserProgress[]>;

  @OneToMany(() => Course, (course) => course.instructor)
  instructorCourses: Course[];

  @OneToMany(() => Certificate, (certificate) => certificate.user)
  certificates: Certificate[];

  @OneToMany(() => CourseReview, (courseReview) => courseReview.user)
  reviews: CourseReview[];

  @OneToMany(() => Payment, payment => payment.user)
  payments: Payment[];

  @OneToMany(() => AuthToken, (authTokens) => authTokens.user)
  authTokens: Promise<UserProgress[]>;

  @OneToOne(() => WalletInfo, (walletInfo) => walletInfo.user) // This defines the inverse relation
  walletInfo: WalletInfo;

  async setPassword(password: string): Promise<void> {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(password, salt);
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
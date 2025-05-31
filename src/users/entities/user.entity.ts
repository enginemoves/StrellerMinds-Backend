import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { UserProgress } from './user-progress.entity';
import { WalletInfo } from './wallet-info.entity';
import { UserRole } from '../enums/userRole.enum';
import { AccountStatus } from '../enums/accountStatus.enum';
import { AuthToken } from '../../auth/entities/auth-token.entity';
import { Course } from '../../courses/entities/course.entity';
import { CourseReview } from '../../courses/entities/course-review.entity';
import { Certificate } from '../../certificate/entity/certificate.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { UserProfile } from 'src/user-profiles/entities/user-profile.entity';
import { UserSettings } from './user-settings.entity';
import { EventSignup } from 'src/event-signup/entities/event-signup.entity';
import { Notification } from 'src/notification/entities/notification.entity';

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

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  @Column({ nullable: true })
  profileImageUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  status: AccountStatus;

  @Column({ nullable: true })
  deactivatedAt: Date;

  @Column({ nullable: true })
  deletionRequestedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;

  @OneToMany(() => UserProgress, (progress) => progress.user)
  progress: Promise<UserProgress[]>;

  @OneToMany(() => Course, (course) => course.instructor)
  instructorCourses: Course[];

  @OneToMany(() => Certificate, (certificate) => certificate.user)
  certificates: Certificate[];

  @OneToMany(() => CourseReview, (courseReview) => courseReview.user)
  reviews: CourseReview[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @OneToMany(() => AuthToken, (authToken) => authToken.user)
  authTokens: Promise<AuthToken[]>;

  @OneToOne(() => WalletInfo, (walletInfo) => walletInfo.user)
  walletInfo: WalletInfo;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
  profile: UserProfile;

  @OneToOne(() => UserSettings, (settings) => settings.user, {
    cascade: true,
    eager: true,
  })
  settings: UserSettings;

  gradesGiven: any;
  gradesReceived: any;

  @OneToMany(() => EventSignup, (signup) => signup.user)
  eventSignups: EventSignup[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  async setPassword(password: string): Promise<void> {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(password, salt);
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}

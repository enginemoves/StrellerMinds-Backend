import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('certificates')
@Index(['userId', 'courseId'], { unique: true })
export class Certificate {
  @ApiProperty({ description: 'Certificate unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Certificate number for display' })
  @Column()
  certificateNumber: string;

  @ApiProperty({ description: 'User who earned the certificate' })
  @Column()
  userId: string;

  @ApiProperty({ description: 'Course for which certificate was issued' })
  @Column()
  courseId: string;

  @ApiProperty({ description: 'Date the certificate was issued' })
  @Column({ type: 'timestamp' })
  issueDate: Date;

  @ApiProperty({ description: 'URL to the PDF certificate in S3' })
  @Column()
  pdfUrl: string;

  @ApiProperty({ description: 'QR code data linking to verification endpoint' })
  @Column()
  qrCode: string;

  @ApiProperty({ description: 'SHA256 checksum of the PDF file' })
  @Column()
  checksum: string;

  @ApiProperty({ description: 'Metadata stored as JSON' })
  @Column({ type: 'jsonb' })
  metadata: {
    courseName: string;
    userName: string;
    completionDate: Date;
    grade?: number;
    instructorName?: string;
    certificateType: string;
    issuingInstitution: string;
    language: string;
  };

  @ApiProperty({ description: 'Whether certificate is verified/valid' })
  @Column({ default: true })
  isValid: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.id, { lazy: true })
  user: Promise<User>;

  @ManyToOne(() => Course, (course) => course.id, { lazy: true })
  course: Promise<Course>;
}

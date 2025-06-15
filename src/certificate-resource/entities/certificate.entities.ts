import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'course_id' })
  courseId: string;

  @Column({ name: 'certificate_number', unique: true })
  certificateNumber: string;

  @Column({ name: 'recipient_name' })
  recipientName: string;

  @Column({ name: 'course_name' })
  courseName: string;

  @Column({ name: 'completion_date', type: 'date' })
  completionDate: Date;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: Date;

  @Column({ name: 'verification_url' })
  verificationUrl: string;

  @Column({ name: 'qr_code_data' })
  qrCodeData: string;

  @Column({ name: 'template_id' })
  templateId: string;

  @Column({ name: 'brand_config', type: 'json', nullable: true })
  brandConfig: any;

  @Column({ name: 'pdf_path', nullable: true })
  pdfPath: string;

  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  @Column({ name: 'revoked_at', nullable: true })
  revokedAt: Date;

  @Column({ name: 'revoked_reason', nullable: true })
  revokedReason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

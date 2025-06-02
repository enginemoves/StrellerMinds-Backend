import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum ProcessingActivity {
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  DATA_ACCESS = 'data_access',
  DATA_UPDATE = 'data_update',
  CONSENT_UPDATE = 'consent_update',
}

@Entity('data_processing_logs')
export class DataProcessingLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: ProcessingActivity,
  })
  activity: ProcessingActivity;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ length: 45 })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}

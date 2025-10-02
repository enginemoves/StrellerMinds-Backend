import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'cid_records' })
export class CidRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  cid: string;

  @Column()
  assetId: string; // FK to assets.id (optional enforcement manually)

  @Column({ nullable: true })
  filename: string;

  @Column({ nullable: true })
  mimeType: string;

  @Column('bigint', { nullable: true })
  size: number;

  @Column({ default: 'pinned' })
  status: 'pinned' | 'unconfirmed' | 'failed' | 'archived';

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: 'jsonb', nullable: true })
  meta?: any;

  @Column({ nullable: true })
  lastError?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

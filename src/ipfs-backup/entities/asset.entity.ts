import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
} from 'typeorm';

@Entity({ name: 'assets' })
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  courseId: string; // associate asset to a course

  @Column()
  originalPath: string; // path or URL in original storage

  @Column()
  filename: string;

  @Column({ nullable: true })
  mimeType: string;

  @Column('bigint', { nullable: true })
  size: number;

  @Column({ nullable: true })
  sha256: string; // content hash for dedupe

  @Column({ default: false })
  backedUp: boolean;

  @Column({ nullable: true })
  lastBackupError: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

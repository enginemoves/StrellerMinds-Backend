import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Content } from './content.entity';

@Entity('content_versions')
export class ContentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'content_id' })
  contentId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'json' })
  content: any;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ type: 'text', nullable: true })
  changelog: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Content, content => content.versions)
  @JoinColumn({ name: 'content_id' })
  content: Content;
}

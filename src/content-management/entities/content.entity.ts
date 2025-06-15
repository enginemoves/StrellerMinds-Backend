import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ContentType, ContentStatus } from '../enums/content.enum';
import { ContentVersion } from './content-version.entity';
import { ContentMedia } from './content-media.entity';

@Entity('contents')
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ContentType,
    default: ContentType.TEXT
  })
  type: ContentType;

  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.DRAFT
  })
  status: ContentStatus;

  @Column({ type: 'json', nullable: true })
  content: any; // Rich content data

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'course_id', nullable: true })
  courseId: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ContentVersion, version => version.content)
  versions: ContentVersion[];

  @OneToMany(() => ContentMedia, media => media.content)
  media: ContentMedia[];

  @OneToMany(() => Content, content => content.parent)
  children: Content[];

  @ManyToOne(() => Content, content => content.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Content;
}

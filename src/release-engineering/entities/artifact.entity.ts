import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Release } from './release.entity';

@Entity({ name: 'artifacts' })
export class Artifact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Release, (release) => release.artifacts, { onDelete: 'CASCADE' })
  release: Release;

  @Column() // e.g. 'registry.example.com/my-app'
  imageName: string;

  @Column() // e.g. 'sha256:...' or docker tag
  imageTag: string;

  @Column({ nullable: true })
  digest?: string;

  @Column({ nullable: true })
  artifactUrl?: string;

  @Column({ nullable: true })
  sizeBytes?: number;

  @CreateDateColumn()
  createdAt: Date;
}

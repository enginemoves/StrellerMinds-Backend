import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Artifact } from './artifact.entity';
import { Deployment } from './deployment.entity';

@Entity({ name: 'releases' })
export class Release {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  semver: string; // e.g. "1.2.0"

  @Column({ nullable: true, type: 'text' })
  releaseNotes?: string;

  @Column({ nullable: true })
  changelogUrl?: string;

  @OneToMany(() => Artifact, (artifact) => artifact.release, { cascade: true })
  artifacts: Artifact[];

  @OneToMany(() => Deployment, (deployment) => deployment.release)
  deployments: Deployment[];

  @Column({ default: false })
  isDraft: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

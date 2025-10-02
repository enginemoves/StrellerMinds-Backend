import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Release } from './release.entity';
import { Env } from './environment.enum';

export enum DeploymentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

@Entity({ name: 'deployments' })
export class Deployment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Release, (release) => release.deployments, { onDelete: 'CASCADE' })
  release: Release;

  @Index()
  @Column({ type: 'enum', enum: Env })
  environment: Env;

  @Column({ type: 'enum', enum: DeploymentStatus, default: DeploymentStatus.PENDING })
  status: DeploymentStatus;

  @Column({ nullable: true })
  triggeredBy?: string; // user id or CI system id

  @Column({ nullable: true, type: 'text' })
  logs?: string;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  finishedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}

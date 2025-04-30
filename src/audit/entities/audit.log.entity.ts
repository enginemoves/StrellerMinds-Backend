import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: string;

  @Column()
  entityType: string;

  @Column()
  entityId: string;

  @Column()
  performedBy: string;

  @Column('jsonb', { default: {} })
  details: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;
}

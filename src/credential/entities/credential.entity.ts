import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('credentials')
export class Credential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  type: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb' })
  metadata: Record<string, any>;

  @Column()
  issuerId: string;

  @Column()
  issuerName: string;

  @CreateDateColumn()
  issuedAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column()
  status: string;

  @Column()
  txHash: string;

  @Column()
  network: string;

  @Column()
  blockHeight: number;

  @Column({ default: false })
  verificationStatus: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
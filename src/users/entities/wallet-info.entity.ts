import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('wallet_info')
export class WalletInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  balance: number;

  @Column()
  currency: string;

  @Column({ unique: true })
  walletAddress: string;

  @Column({ nullable: true })
  walletType: string;

  @Column({ nullable: true })
  chainId: string;
   @Column({ type: 'jsonb', nullable: true })
  blockchainCredentials: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // New fields for handling orphaned wallets after account deletion
  @Column({ default: false })
  orphaned: boolean;

  @Column({ nullable: true })
  orphanedAt: Date;

  @OneToOne(() => User, (user) => user.walletInfo)
  @JoinColumn()
  user: User;
}

 




  

 
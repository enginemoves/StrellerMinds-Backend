import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('wallet_info')
export class WalletInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  balance: number;

  @Column()
  currency: string;

  @OneToOne(() => User, (user) => user.walletInfo)
  @JoinColumn()
  user: User;
}
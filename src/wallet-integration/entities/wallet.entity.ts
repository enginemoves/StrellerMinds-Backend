import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Credential } from './credential.entity';

export enum WalletType {
  METAMASK = 'metamask',
  WALLETCONNECT = 'walletconnect',
  COINBASE = 'coinbase',
  PHANTOM = 'phantom',
  TRUST = 'trust'
}

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  address: string;

  @Column({
    type: 'enum',
    enum: WalletType,
  })
  type: WalletType;

  @Column({ nullable: true })
  ensName?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastConnectedAt?: Date;

  @OneToMany(() => Credential, credential => credential.wallet)
  credentials: Credential[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

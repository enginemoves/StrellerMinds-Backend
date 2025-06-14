import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column('uuid')
  customerId: string;

  @Column('uuid', { nullable: true })
  courseId?: string;

  @Column('uuid', { nullable: true })
  subscriptionId?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  gatewayTransactionId?: string;

  @Column('json', { nullable: true })
  metadata?: Record<string, any>;

  @Column('json', { nullable: true })
  gatewayResponse?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { User } from './user.entity';
  
  
  @Entity('user_settings')
  export class UserSettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ default: true })
    darkModeEnabled: boolean;
  
    @Column({ default: false })
    newsletterSubscribed: boolean;
  
    @Column({ default: 'en' })
    preferredLanguage: string;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    @OneToOne(() => User, (user) => user.settings, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
  }
  
import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity()
@Unique(['userId'])
export class UserSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column({ default: 'en' })
  language: string;

  @Column({ default: 'light' })
  theme: 'light' | 'dark';

  @Column({ default: true })
  emailNotifications: boolean;

  @Column({ default: true })
  pushNotifications: boolean;

  // Accessibility Settings
  @Column({ default: 'medium' })
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';

  @Column({ default: false })
  highContrastMode: boolean;

  @Column({ default: false })
  reducedMotion: boolean;

  @Column({ default: false })
  screenReaderOptimized: boolean;

  @Column({ default: 'normal' })
  contrast: 'normal' | 'high' | 'extra-high';

  @Column({ default: false })
  keyboardNavigationMode: boolean;

  @Column({ default: false })
  audioDescriptions: boolean;

  @Column({ default: false })
  captionsEnabled: boolean;
}

import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateUserSettingDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsIn(['en', 'fr', 'es', 'ar'])
  language?: string;

  @IsOptional()
  @IsIn(['light', 'dark'])
  theme?: 'light' | 'dark';

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  // Accessibility Settings
  @IsOptional()
  @IsIn(['small', 'medium', 'large', 'extra-large'])
  fontSize?: 'small' | 'medium' | 'large' | 'extra-large';

  @IsOptional()
  @IsBoolean()
  highContrastMode?: boolean;

  @IsOptional()
  @IsBoolean()
  reducedMotion?: boolean;

  @IsOptional()
  @IsBoolean()
  screenReaderOptimized?: boolean;

  @IsOptional()
  @IsIn(['normal', 'high', 'extra-high'])
  contrast?: 'normal' | 'high' | 'extra-high';

  @IsOptional()
  @IsBoolean()
  keyboardNavigationMode?: boolean;

  @IsOptional()
  @IsBoolean()
  audioDescriptions?: boolean;

  @IsOptional()
  @IsBoolean()
  captionsEnabled?: boolean;
}

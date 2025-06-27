import { IsOptional, IsString, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateNotificationSettingsDto } from './create-notification-settings.dto';

export class CreateUserPreferencesDto {
  @IsOptional()
  @IsObject()
  learningCustomization?: {
    preferredTopics?: string[];
    learningPace?: 'slow' | 'medium' | 'fast';
    learningGoals?: string;
  };

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateNotificationSettingsDto)
  notificationSettings?: CreateNotificationSettingsDto;

  @IsOptional()
  @IsObject()
  personalizationData?: {
    theme?: string;
    language?: string;
    accessibility?: string[];
  };
} 
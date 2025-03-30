import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsString, IsUUID, IsEnum, IsArray, IsOptional, IsObject, IsBoolean } from "class-validator"
import { NotificationType, NotificationPriority } from "../entities/notification.entity"

export class CreateNotificationDto {
  @ApiProperty({ description: "User ID to send notification to" })
  @IsUUID()
  userId: string

  @ApiProperty({ description: "Notification title" })
  @IsString()
  title: string

  @ApiProperty({ description: "Notification content" })
  @IsString()
  content: string

  @ApiProperty({
    description: "Notification types",
    enum: NotificationType,
    isArray: true,
    default: [NotificationType.IN_APP],
  })
  @IsEnum(NotificationType, { each: true })
  @IsArray()
  types: NotificationType[]

  @ApiProperty({ description: "Notification category" })
  @IsString()
  category: string

  @ApiPropertyOptional({
    description: "Notification priority",
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority

  @ApiPropertyOptional({ description: "Additional metadata for the notification" })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>

  @ApiPropertyOptional({ description: "Whether to send notification immediately" })
  @IsBoolean()
  @IsOptional()
  sendImmediately?: boolean
}


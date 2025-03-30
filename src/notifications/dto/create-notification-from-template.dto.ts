import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsString, IsUUID, IsEnum, IsArray, IsOptional, IsObject, IsBoolean } from "class-validator"
import { NotificationType, NotificationPriority } from "../entities/notification.entity"

export class CreateNotificationFromTemplateDto {
  @ApiProperty({ description: "User ID to send notification to" })
  @IsUUID()
  userId: string

  @ApiProperty({ description: "Template code to use" })
  @IsString()
  templateCode: string

  @ApiPropertyOptional({
    description: "Notification types to override template defaults",
    enum: NotificationType,
    isArray: true,
  })
  @IsEnum(NotificationType, { each: true })
  @IsArray()
  @IsOptional()
  types?: NotificationType[]

  @ApiPropertyOptional({
    description: "Notification priority",
    enum: NotificationPriority,
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority

  @ApiProperty({ description: "Template variables to replace in content" })
  @IsObject()
  templateVariables: Record<string, any>

  @ApiPropertyOptional({ description: "Additional metadata for the notification" })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>

  @ApiPropertyOptional({ description: "Whether to send notification immediately" })
  @IsBoolean()
  @IsOptional()
  sendImmediately?: boolean
}


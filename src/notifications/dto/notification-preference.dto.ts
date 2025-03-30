import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsString, IsEnum, IsArray, IsOptional, IsBoolean } from "class-validator"
import { NotificationType } from "../entities/notification.entity"

export class NotificationPreferenceDto {
  @ApiProperty({ description: "Notification category" })
  @IsString()
  category: string

  @ApiProperty({
    description: "Enabled notification types",
    enum: NotificationType,
    isArray: true,
  })
  @IsEnum(NotificationType, { each: true })
  @IsArray()
  enabledTypes: NotificationType[]

  @ApiPropertyOptional({ description: "Whether notifications are enabled for this category" })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean
}


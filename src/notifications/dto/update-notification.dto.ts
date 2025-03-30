import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsEnum, IsOptional } from "class-validator"
import { NotificationStatus } from "../entities/notification.entity"

export class UpdateNotificationDto {
  @ApiPropertyOptional({
    description: "Notification status",
    enum: NotificationStatus,
  })
  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus
}


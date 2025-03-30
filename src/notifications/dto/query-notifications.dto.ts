import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from "class-validator"
import { Type } from "class-transformer"
import { NotificationStatus } from "../entities/notification.entity"

export class QueryNotificationsDto {
  @ApiPropertyOptional({
    description: "Filter by notification status",
    enum: NotificationStatus,
  })
  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus

  @ApiPropertyOptional({ description: "Filter by notification category" })
  @IsString()
  @IsOptional()
  category?: string

  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1

  @ApiPropertyOptional({ description: "Items per page", default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20
}


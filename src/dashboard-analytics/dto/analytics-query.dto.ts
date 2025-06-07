import { IsOptional, IsDateString, IsEnum, IsUUID, IsInt, Min, Max } from "class-validator"
import { Type } from "class-transformer"
import { ApiPropertyOptional } from "@nestjs/swagger"

export enum TimeRange {
  LAST_7_DAYS = "last_7_days",
  LAST_30_DAYS = "last_30_days",
  LAST_90_DAYS = "last_90_days",
  LAST_YEAR = "last_year",
  CUSTOM = "custom",
}

export enum ExportFormat {
  JSON = "json",
  CSV = "csv",
  EXCEL = "excel",
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: TimeRange })
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange = TimeRange.LAST_30_DAYS

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  courseId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  instructorId?: string

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0
}

export class ExportQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.JSON
}

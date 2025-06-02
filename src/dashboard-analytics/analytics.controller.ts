import { Controller, Get, UseGuards, Request, Post, Body, HttpCode, HttpStatus, Header } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import type { AnalyticsService } from "./analytics.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { type AnalyticsQueryDto, type ExportQueryDto, ExportFormat } from "./dto/analytics-query.dto"
import { AnalyticsDashboardResponse } from "./dto/analytics-response.dto"
import type { EngagementType } from "./entities/user-engagement.entity"
import type { CompletionStatus } from "./entities/course-completion.entity"

@ApiTags("Analytics")
@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("dashboard")
  @Roles("admin", "instructor")
  @ApiOperation({
    summary: "Get analytics dashboard data",
    description: "Retrieve comprehensive analytics data including user engagement and course completion metrics",
  })
  @ApiResponse({
    status: 200,
    description: "Analytics dashboard data retrieved successfully",
    type: AnalyticsDashboardResponse,
  })
  async getDashboard(query: AnalyticsQueryDto, @Request() req: any): Promise<AnalyticsDashboardResponse> {
    return this.analyticsService.getDashboardAnalytics(query, req.user.role, req.user.id)
  }

  @Get("export")
  @Roles("admin", "instructor")
  @ApiOperation({
    summary: "Export analytics data",
    description: "Export analytics data in various formats (JSON, CSV, Excel)",
  })
  @ApiResponse({
    status: 200,
    description: "Analytics data exported successfully",
  })
  @Header("Content-Type", "application/octet-stream")
  async exportAnalytics(query: ExportQueryDto, @Request() req: any): Promise<any> {
    const data = await this.analyticsService.exportAnalytics(query, req.user.role, req.user.id)

    if (query.format === ExportFormat.CSV) {
      return data
    }

    return data
  }

  @Post("engagement")
  @Roles("admin", "instructor", "student")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Track user engagement",
    description: "Record user engagement events for analytics tracking",
  })
  @ApiResponse({
    status: 201,
    description: "User engagement tracked successfully",
  })
  async trackEngagement(
    @Body() engagementData: {
      engagementType: EngagementType;
      courseId?: string;
      metadata?: Record<string, any>;
      duration?: number;
    },
    @Request() req: any,
  ) {
    return this.analyticsService.trackUserEngagement(
      req.user.id,
      engagementData.engagementType,
      engagementData.courseId,
      engagementData.metadata,
      engagementData.duration,
    )
  }

  @Post("course-progress")
  @Roles("admin", "instructor", "student")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update course progress",
    description: "Update student progress in a course for completion tracking",
  })
  @ApiResponse({
    status: 200,
    description: "Course progress updated successfully",
  })
  async updateCourseProgress(
    @Body() progressData: {
      courseId: string;
      progressPercentage?: number;
      lessonsCompleted?: number;
      totalLessons?: number;
      timeSpent?: number;
      status?: CompletionStatus;
    },
    @Request() req: any,
  ) {
    return this.analyticsService.updateCourseProgress(req.user.id, progressData.courseId, progressData)
  }

  @Get("user-engagement")
  @Roles("admin")
  @ApiOperation({
    summary: "Get detailed user engagement metrics",
    description: "Retrieve detailed user engagement analytics (admin only)",
  })
  @ApiResponse({
    status: 200,
    description: "User engagement metrics retrieved successfully",
  })
  async getUserEngagementDetails(query: AnalyticsQueryDto, @Request() req: any) {
    // This would return more detailed engagement data
    // Implementation would be similar to dashboard but with more granular data
    return { message: "Detailed user engagement metrics endpoint" }
  }

  @Get("course-performance")
  @Roles("admin", "instructor")
  @ApiOperation({
    summary: "Get course performance analytics",
    description: "Retrieve detailed course performance and completion analytics",
  })
  @ApiResponse({
    status: 200,
    description: "Course performance metrics retrieved successfully",
  })
  async getCoursePerformance(query: AnalyticsQueryDto, @Request() req: any) {
    // This would return detailed course performance data
    // Implementation would focus on course-specific metrics
    return { message: "Course performance analytics endpoint" }
  }
}

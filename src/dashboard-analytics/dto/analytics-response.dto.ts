import { ApiProperty } from "@nestjs/swagger"

export class UserEngagementMetrics {
  @ApiProperty()
  totalUsers: number

  @ApiProperty()
  activeUsers: number

  @ApiProperty()
  newUsers: number

  @ApiProperty()
  averageSessionDuration: number

  @ApiProperty()
  totalSessions: number

  @ApiProperty()
  engagementByType: Record<string, number>
}

export class CourseCompletionMetrics {
  @ApiProperty()
  totalEnrollments: number

  @ApiProperty()
  completedCourses: number

  @ApiProperty()
  inProgressCourses: number

  @ApiProperty()
  droppedCourses: number

  @ApiProperty()
  averageCompletionRate: number

  @ApiProperty()
  averageTimeToComplete: number

  @ApiProperty()
  courseCompletionRates: Array<{
    courseId: string
    courseName: string
    completionRate: number
    totalEnrollments: number
  }>
}

export class AnalyticsDashboardResponse {
  @ApiProperty()
  userEngagement: UserEngagementMetrics

  @ApiProperty()
  courseCompletion: CourseCompletionMetrics

  @ApiProperty()
  timeRange: {
    startDate: string
    endDate: string
  }

  @ApiProperty()
  generatedAt: string
}

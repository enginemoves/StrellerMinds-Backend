import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ProgressDashboardQueryDto } from '../dto/progress-dashboard-query.dto';
import { ProgressDashboardResponseDto } from '../dto/progress-dashboard-response.dto';
import { ProgressStatsDto } from '../dto/progress-stats.dto';
import { CourseProgressDto } from '../dto/course-progress.dto';
import { RecentActivityDto } from '../dto/recent-activity.dto';
import { CourseStatus } from '../enums/course-status.enum';
import { TimeRange } from '../enums/time-range.enum';

@Injectable()
export class UserProgressService {
  private readonly logger = new Logger(UserProgressService.name);

  constructor(
    // Inject your repositories/services here
    // private readonly userRepository: Repository<User>,
    // private readonly courseRepository: Repository<Course>,
    // private readonly enrollmentRepository: Repository<Enrollment>,
    // private readonly activityRepository: Repository<Activity>,
  ) {}

  /**
   * Get comprehensive user progress dashboard data
   * 
   * Calculation Methodology:
   * - Overall completion: (Sum of all course completions) / (Total enrolled courses)
   * - Course completion: (Completed lessons) / (Total lessons in course)
   * - Time calculations: Aggregated from activity logs
   * - Learning streak: Consecutive days with learning activity
   */
  async getUserProgressDashboard(
    userId: string,
    query: ProgressDashboardQueryDto
  ): Promise<ProgressDashboardResponseDto> {
    try {
      this.logger.log(`Fetching progress dashboard for user: ${userId}`);

      // Validate date range if custom dates provided
      if (query.startDate && query.endDate) {
        const start = new Date(query.startDate);
        const end = new Date(query.endDate);
        if (start >= end) {
          throw new BadRequestException('Start date must be before end date');
        }
      }

      // Get date range for filtering
      const dateRange = this.getDateRange(query.timeRange, query.startDate, query.endDate);

      // Execute parallel queries for better performance
      const [stats, courses, recentActivity, totalCourses] = await Promise.all([
        this.calculateProgressStats(userId, dateRange),
        this.getUserCourseProgress(userId, query),
        this.getRecentActivity(userId, dateRange, 10),
        this.getTotalCoursesCount(userId, query.status)
      ]);

      return {
        stats,
        courses,
        recentActivity,
        totalCourses,
        offset: query.offset,
        limit: query.limit
      };

    } catch (error) {
      this.logger.error(`Error fetching progress dashboard: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate comprehensive progress statistics
   */
  private async calculateProgressStats(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<ProgressStatsDto> {
    // Mock implementation - replace with actual database queries
    
    // Example query structure:
    /*
    const enrollments = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('enrollment.progress', 'progress')
      .where('enrollment.userId = :userId', { userId })
      .getMany();
    */

    // Mock data for demonstration
    const mockStats: ProgressStatsDto = {
      overallCompletionPercentage: 68.5,
      totalEnrolledCourses: 12,
      activeCourses: 5,
      completedCourses: 4,
      pausedCourses: 2,
      notStartedCourses: 1,
      totalTimeSpentHours: 147.5,
      averageCompletionRate: 71.2,
      coursesCompletedThisMonth: 2,
      currentLearningStreak: 5,
      longestLearningStreak: 21
    };

    return mockStats;
  }

  /**
   * Get detailed course progress for user
   */
  private async getUserCourseProgress(
    userId: string,
    query: ProgressDashboardQueryDto
  ): Promise<CourseProgressDto[]> {
    // Mock implementation - replace with actual database queries
    
    // Example query with filtering and pagination:
    /*
    const queryBuilder = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('enrollment.progress', 'progress')
      .where('enrollment.userId = :userId', { userId });

    if (query.status) {
      queryBuilder.andWhere('enrollment.status = :status', { status: query.status });
    }

    const courses = await queryBuilder
      .orderBy('enrollment.lastActivityDate', 'DESC')
      .skip(query.offset)
      .take(query.limit)
      .getMany();
    */

    // Mock data for demonstration
    const mockCourses: CourseProgressDto[] = [
      {
        courseId: 'course-1',
        title: 'Advanced JavaScript Concepts',
        status: CourseStatus.ACTIVE,
        completionPercentage: 75,
        totalLessons: 20,
        completedLessons: 15,
        timeSpentHours: 24.5,
        lastActivityDate: new Date('2024-06-15'),
        enrollmentDate: new Date('2024-05-01'),
      },
      {
        courseId: 'course-2',
        title: 'React Fundamentals',
        status: CourseStatus.COMPLETED,
        completionPercentage: 100,
        totalLessons: 15,
        completedLessons: 15,
        timeSpentHours: 18.0,
        lastActivityDate: new Date('2024-06-10'),
        enrollmentDate: new Date('2024-04-15'),
        completionDate: new Date('2024-06-10'),
      }
    ];

    return mockCourses;
  }

  /**
   * Get recent learning activity
   */
  private async getRecentActivity(
    userId: string,
    dateRange: { start: Date; end: Date },
    limit: number
  ): Promise<RecentActivityDto[]> {
    // Mock implementation - replace with actual database queries
    
    // Example query:
    /*
    const activities = await this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.lesson', 'lesson')
      .leftJoinAndSelect('lesson.course', 'course')
      .where('activity.userId = :userId', { userId })
      .andWhere('activity.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end
      })
      .orderBy('activity.createdAt', 'DESC')
      .take(limit)
      .getMany();
    */

    // Mock data for demonstration
    const mockActivity: RecentActivityDto[] = [
      {
        date: new Date('2024-06-15'),
        courseId: 'course-1',
        courseTitle: 'Advanced JavaScript Concepts',
        lessonId: 'lesson-15',
        lessonTitle: 'Async/Await Patterns',
        activityType: 'lesson_completed',
        timeSpentMinutes: 45
      },
      {
        date: new Date('2024-06-14'),
        courseId: 'course-1',
        courseTitle: 'Advanced JavaScript Concepts',
        lessonId: 'lesson-14',
        lessonTitle: 'Promise Chains',
        activityType: 'lesson_started',
        timeSpentMinutes: 30
      }
    ];

    return mockActivity;
  }

  /**
   * Get total courses count for pagination
   */
  private async getTotalCoursesCount(
    userId: string,
    status?: CourseStatus
  ): Promise<number> {
    // Mock implementation - replace with actual database queries
    return 12;
  }

  /**
   * Convert time range enum to actual date range
   */
  private getDateRange(
    timeRange: TimeRange,
    startDate?: string,
    endDate?: string
  ): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      switch (timeRange) {
        case TimeRange.LAST_7_DAYS:
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case TimeRange.LAST_30_DAYS:
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case TimeRange.LAST_90_DAYS:
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case TimeRange.LAST_YEAR:
          start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case TimeRange.ALL_TIME:
        default:
          start = new Date('2020-01-01'); // Or your app's launch date
          break;
      }
    }

    return { start, end };
  }
}

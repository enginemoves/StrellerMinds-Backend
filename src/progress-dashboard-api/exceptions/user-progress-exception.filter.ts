import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class UserProgressExceptionFilter implements ExceptionFilter {
  let app: INestApplication;
  let userProgressService: UserProgressService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UserProgressController],
      providers: [
        {
          provide: UserProgressService,
          useValue: {
            getUserProgressDashboard: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    userProgressService = moduleFixture.get<UserProgressService>(UserProgressService);
    await app.init();
  });

  it('/api/v1/user/progress/dashboard (GET) - should return dashboard data', async () => {
    const mockDashboard: ProgressDashboardResponseDto = {
      stats: {
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
      },
      courses: [],
      recentActivity: [],
      totalCourses: 12,
      offset: 0,
      limit: 10
    };

    jest.spyOn(userProgressService, 'getUserProgressDashboard')
      .mockResolvedValue(mockDashboard);

    return request(app.getHttpServer())
      .get('/api/v1/user/progress/dashboard')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect(mockDashboard);
  });

  it('/api/v1/user/progress/dashboard (GET) - should handle query parameters', async () => {
    const mockDashboard: ProgressDashboardResponseDto = {
      stats: {} as ProgressStatsDto,
      courses: [],
      recentActivity: [],
      totalCourses: 5,
      offset: 0,
      limit: 10
    };

    jest.spyOn(userProgressService, 'getUserProgressDashboard')
      .mockResolvedValue(mockDashboard);

    return request(app.getHttpServer())
      .get('/api/v1/user/progress/dashboard')
      .query({
        status: CourseStatus.ACTIVE,
        timeRange: TimeRange.LAST_30_DAYS,
        limit: 5,
        offset: 0
      })
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
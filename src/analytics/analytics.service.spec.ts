import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Analytics } from './entities/analytics.entity';
import { Repository } from 'typeorm';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let repo: Repository<Analytics>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Analytics),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    repo = module.get<Repository<Analytics>>(getRepositoryToken(Analytics));
  });

  it('should return user engagement trends', async () => {
    jest.spyOn(repo, 'find').mockResolvedValue([
      {
        id: 1,
        eventType: 'login',
        userId: 123,
        courseId: null,
        additionalData: null,
        createdAt: new Date('2025-03-24T12:00:00Z'),
      },
      {
        id: 2,
        eventType: 'view_course',
        userId: 456,
        courseId: 42,
        additionalData: { device: 'mobile' },
        createdAt: new Date('2025-03-24T13:00:00Z'),
      },
    ] as Analytics[]);

    const result = await service.getUserEngagementTrends();
    expect(result).toEqual([{ date: '2025-03-24', count: 2 }]);
  });
});

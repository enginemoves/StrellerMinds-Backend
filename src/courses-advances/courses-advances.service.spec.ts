import { Test, TestingModule } from '@nestjs/testing';
import { CoursesAdvancesService } from './courses-advances.service';

describe('CoursesAdvancesService', () => {
  let service: CoursesAdvancesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoursesAdvancesService],
    }).compile();

    service = module.get<CoursesAdvancesService>(CoursesAdvancesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

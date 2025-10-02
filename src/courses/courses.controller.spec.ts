import { Test, TestingModule } from '@nestjs/testing';
import { CourseController } from './courses.controller';
import { CourseService } from './courses.service';

describe('CourseController', () => {
  let controller: CourseController;
  let service: CourseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [{
        provide: CourseService,
        useValue: {
          findAll: jest.fn().mockResolvedValue([]),
          findOne: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
          remove: jest.fn().mockResolvedValue({}),
          findElectiveCourses: jest.fn().mockResolvedValue({
            items: [],
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0
          }),
        }
      }],
    }).compile();

    controller = module.get<CourseController>(CourseController);
    service = module.get<CourseService>(CourseService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call findElectiveCourses with query parameters', async () => {
    const query = {
      search: 'blockchain',
      category: 'Science',
      creditHours: 3,
      isActive: true,
      page: 1,
      limit: 10
    };

    await controller.findElectiveCourses(query);

    expect(service.findElectiveCourses).toHaveBeenCalledWith(query);
  });
});

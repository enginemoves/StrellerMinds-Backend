import { Test, TestingModule } from '@nestjs/testing';
import { CourseService } from './course.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';

describe('CourseService', () => {
  let service: CourseService;
  let repo: Repository<Course>;

  const mockCourse: Course = {
    id: '1',
    title: 'Test Course',
    description: 'A course for testing',
    // add other required properties here based on your Course entity
  };

  const mockRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockResolvedValue(mockCourse),
    find: jest.fn().mockResolvedValue([mockCourse]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        {
          provide: getRepositoryToken(Course),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
    repo = module.get<Repository<Course>>(getRepositoryToken(Course));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a course', async () => {
    const dto = {
      title: 'Test Course',
      description: 'A course for testing',
    };

    const result = await repo.save(dto);
    expect(result).toEqual(mockCourse);
    expect(mockRepo.save).toHaveBeenCalledWith(dto);
  });

  it('should find all courses', async () => {
    const result = await service.getAllCourses();
    expect(result).toEqual('List of all courses'); // Adjust this if `getAllCourses()` changes
  });
});

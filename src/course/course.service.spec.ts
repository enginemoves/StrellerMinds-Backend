import { Test, TestingModule } from '@nestjs/testing';
import { CourseService } from './course.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { Repository } from 'typeorm';

const mockCourse = {
  id: '1',
  title: 'Test Course',
  description: 'Test Description',
  difficulty: 'Beginner',
  modules: [],
};

describe('CourseService', () => {
  let service: CourseService;
  let repo: Repository<Course>;

  const mockRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockResolvedValue(mockCourse),
    find: jest.fn().mockResolvedValue([mockCourse]),
    findOne: jest.fn().mockResolvedValue(mockCourse),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
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
    const dto = { ...mockCourse };
    const result = await service.create(dto);
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.save).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockCourse);
  });

  it('should find all courses', async () => {
    const result = await service.findAll();
    expect(repo.find).toHaveBeenCalled();
    expect(result).toEqual([mockCourse]);
  });

  it('should find one course by id', async () => {
    const result = await service.findOne('1');
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(result).toEqual(mockCourse);
  });

  it('should update a course', async () => {
    const dto = { title: 'Updated Title' };
    await service.update('1', dto);
    expect(repo.update).toHaveBeenCalledWith('1', dto);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  it('should delete a course', async () => {
    const result = await service.remove('1');
    expect(repo.delete).toHaveBeenCalledWith('1');
    expect(result).toEqual({ affected: 1 });
  });
});

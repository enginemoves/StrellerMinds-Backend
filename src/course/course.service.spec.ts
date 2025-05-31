import { Test, TestingModule } from '@nestjs/testing';
import { CourseService } from './course.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Course } from './course.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

const mockCourse = {
  id: 1,
  title: 'Test Course',
  description: 'This is a test',
  status: 'draft',
};

const mockCourses = [
  { ...mockCourse },
  { id: 2, title: 'Another Course', description: 'Another test', status: 'published' },
];

describe('CourseService', () => {
  let service: CourseService;
  let repo: Repository<Course>;

  const mockRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockResolvedValue(mockCourse),
    find: jest.fn().mockResolvedValue(mockCourses),
    findOneBy: jest.fn().mockResolvedValue(mockCourse),
    remove: jest.fn().mockResolvedValue(undefined),
    count: jest.fn().mockResolvedValue(1),
    findByIds: jest.fn().mockResolvedValue(mockCourses),
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
    const result = await service.create(mockCourse);
    expect(repo.create).toHaveBeenCalledWith(mockCourse);
    expect(repo.save).toHaveBeenCalled();
    expect(result).toEqual(mockCourse);
  });

  it('should find all courses', async () => {
    const result = await service.findAll();
    expect(repo.find).toHaveBeenCalled();
    expect(result).toEqual(mockCourses);
  });

  it('should find one course by ID', async () => {
    const result = await service.findOne(1);
    expect(repo.findOneBy).toHaveBeenCalledWith({ id: 1 });
    expect(result).toEqual(mockCourse);
  });

  it('should throw NotFoundException if course not found', async () => {
    jest.spyOn(repo, 'findOneBy').mockResolvedValueOnce(null);
    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('should update a course', async () => {
    const updated = { ...mockCourse, title: 'Updated Title' };
    jest.spyOn(repo, 'save').mockResolvedValue(updated);
    const result = await service.update(1, { title: 'Updated Title' });
    expect(result.title).toBe('Updated Title');
  });

  it('should delete a course', async () => {
    const result = await service.remove(1);
    expect(repo.remove).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('should bulk create courses', async () => {
    jest.spyOn(repo, 'save').mockResolvedValue(mockCourses);
    const result = await service.bulkCreate(mockCourses);
    expect(repo.create).toHaveBeenCalled();
    expect(result.length).toBe(2);
  });

  it('should bulk update courses', async () => {
    const updates = [
      { id: 1, data: { title: 'Updated 1' } },
      { id: 2, data: { title: 'Updated 2' } },
    ];
    jest.spyOn(repo, 'save').mockResolvedValue(mockCourses);
    const result = await service.bulkUpdate(updates);
    expect(result.length).toBe(2);
  });

  it('should bulk delete courses', async () => {
    const result = await service.bulkDelete([1, 2]);
    expect(repo.findByIds).toHaveBeenCalledWith([1, 2]);
    expect(repo.remove).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('should get course analytics', async () => {
    const result = await service.getCourseAnalytics();
    expect(result).toEqual({
      total: 1,
      published: 1,
      draft: 1,
      archived: 1,
    });
  });

  it('should update course status', async () => {
    const updated = { ...mockCourse, status: 'published' };
    jest.spyOn(repo, 'save').mockResolvedValue(updated);
    const result = await service.updateStatus(1, 'published');
    expect(result.status).toBe('published');
  });

  it('should find by status', async () => {
    const result = await service.findByStatus('draft');
    expect(result).toEqual(mockCourses);
  });
});

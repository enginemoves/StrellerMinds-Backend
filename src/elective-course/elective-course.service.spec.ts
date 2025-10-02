import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElectiveCourseService } from './elective-course.service';
import { ElectiveCourse } from './entities/elective-course.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

type MockRepo<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = (): MockRepo => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
});

describe('ElectiveCourseService', () => {
  let service: ElectiveCourseService;
  let repo: MockRepo<ElectiveCourse>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElectiveCourseService,
        { provide: getRepositoryToken(ElectiveCourse), useValue: createMockRepository() },
      ],
    }).compile();

    service = module.get<ElectiveCourseService>(ElectiveCourseService);
    repo = module.get<MockRepo<ElectiveCourse>>(getRepositoryToken(ElectiveCourse));
  });

  describe('createCourse', () => {
    it('throws BadRequest if title missing or creditHours <= 0', async () => {
      await expect(service.createCourse({ title: '', creditHours: 0 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates and returns the course', async () => {
      const dto = { title: 'AI Ethics', creditHours: 3 } as any;
      const created = { id: '1', ...dto } as ElectiveCourse;
      (repo.create as jest.Mock).mockReturnValue(created);
      (repo.save as jest.Mock).mockResolvedValue(created);
      await expect(service.createCourse(dto)).resolves.toEqual(created);
      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalledWith(created);
    });
  });

  describe('getAllCourses', () => {
    it('returns all courses', async () => {
      const list = [{ id: '1' }] as ElectiveCourse[];
      (repo.find as jest.Mock).mockResolvedValue(list);
      await expect(service.getAllCourses()).resolves.toEqual(list);
    });
  });

  describe('getCourseById', () => {
    it('returns course when found', async () => {
      const entity = { id: '1', title: 'X', creditHours: 2 } as ElectiveCourse;
      (repo.findOne as jest.Mock).mockResolvedValue(entity);
      await expect(service.getCourseById('1')).resolves.toEqual(entity);
    });

    it('throws NotFound when missing', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.getCourseById('404')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateCourse', () => {
    it('validates fields and saves', async () => {
      const existing = { id: '1', title: 'Old', creditHours: 2 } as ElectiveCourse;
      (repo.findOne as jest.Mock).mockResolvedValue(existing);
      const updated = { ...existing, title: 'New' } as ElectiveCourse;
      (repo.save as jest.Mock).mockResolvedValue(updated);
      await expect(service.updateCourse('1', { title: 'New' })).resolves.toEqual(updated);
    });

    it('throws BadRequest for empty title or invalid creditHours', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue({ id: '1', title: 'Old', creditHours: 2 });
      await expect(service.updateCourse('1', { title: '' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.updateCourse('1', { creditHours: 0 })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('deleteCourse', () => {
    it('deletes when affected > 0', async () => {
      (repo.delete as jest.Mock).mockResolvedValue({ affected: 1 });
      await expect(service.deleteCourse('1')).resolves.toBeUndefined();
    });

    it('throws NotFound when nothing deleted', async () => {
      (repo.delete as jest.Mock).mockResolvedValue({ affected: 0 });
      await expect(service.deleteCourse('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});



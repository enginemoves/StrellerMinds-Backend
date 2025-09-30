// Declare global test functions to avoid TypeScript errors
declare const describe: (name: string, callback: () => void) => void;
declare const it: (name: string, callback: () => void) => void;
declare const beforeEach: (callback: () => void) => void;
declare const expect: (value: any) => any;

// Mock Jest namespace
const jest = {
  fn: () => {
    const mockFn: any = () => {};
    mockFn.mockResolvedValue = (value: any) => {
      mockFn.mockImplementation = () => Promise.resolve(value);
      return mockFn;
    };
    mockFn.mockReturnValue = (value: any) => {
      mockFn.mockImplementation = () => value;
      return mockFn;
    };
    mockFn.mockImplementation = () => {};
    mockFn.mockReturnThis = () => mockFn;
    return mockFn;
  },
  spyOn: () => ({
    mockImplementation: () => {}
  })
};

import { CourseService } from './courses.service';

describe('CourseService', () => {
  let service: CourseService;
  let mockCourseRepository: any;
  let mockSharedUtilityService: any;
  let mockEventEmitter: any;

  beforeEach(() => {
    // Create mock repositories
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getOne: jest.fn().mockResolvedValue(null),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(null)
    };

    mockCourseRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockResolvedValue({}),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      softDelete: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0)
    };

    // Create mock services
    mockSharedUtilityService = {
      sanitizeInput: jest.fn().mockImplementation((input: string) => input),
      removeEmptyValues: jest.fn().mockImplementation((input: any) => input)
    };

    mockEventEmitter = {
      emit: jest.fn()
    };

    // Create service instance
    service = new CourseService(
      mockCourseRepository,
      mockSharedUtilityService,
      mockEventEmitter
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find courses by instructor with optimized query', async () => {
    const instructorId = 'test-instructor-id';
    const options = { page: 1, limit: 10 };
    const relations = ['modules', 'tags'];
    
    await service.findByInstructor(instructorId, options, relations);
    
    // Verify that createQueryBuilder was called
    expect(mockCourseRepository.createQueryBuilder).toHaveBeenCalled();
  });

  it('should find courses by category with optimized query', async () => {
    const categoryId = 'test-category-id';
    const options = { page: 1, limit: 10 };
    const relations = ['modules', 'tags'];
    
    await service.findByCategory(categoryId, options, relations);
    
    // Verify that createQueryBuilder was called
    expect(mockCourseRepository.createQueryBuilder).toHaveBeenCalled();
  });

  it('should get course statistics with optimized query', async () => {
    const courseId = 'test-course-id';
    
    // Mock the query builder chain for statistics
    const mockStatsQueryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        modulecount: '5',
        lessoncount: '10',
        reviewcount: '3',
        enrollmentcount: '25',
        averagerating: '4.5'
      })
    };
    
    mockCourseRepository.createQueryBuilder.mockReturnValue(mockStatsQueryBuilder);
    
    const stats = await service.getCourseStatistics(courseId);
    
    expect(stats).toHaveProperty('moduleId');
    expect(stats).toHaveProperty('moduleCount');
    expect(stats).toHaveProperty('lessonCount');
    expect(stats).toHaveProperty('reviewCount');
    expect(stats).toHaveProperty('enrollmentCount');
    expect(stats).toHaveProperty('averageRating');
  });

  it('should get popular courses with optimized query', async () => {
    // Mock the query builder chain for popular courses
    const mockPopularQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn().mockResolvedValue({
        entities: [{ id: '1', title: 'Test Course' }]
      })
    };
    
    mockCourseRepository.createQueryBuilder.mockReturnValue(mockPopularQueryBuilder);
    
    const popularCourses = await service.getPopularCourses(5);
    
    expect(popularCourses).toHaveLength(1);
    expect(mockCourseRepository.createQueryBuilder).toHaveBeenCalled();
  });

  describe('findElectiveCourses', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0])
      };
      
      mockCourseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should find elective courses with no filters', async () => {
      const query = { page: 1, limit: 10 };
      
      const result = await service.findElectiveCourses(query);
      
      expect(mockCourseRepository.createQueryBuilder).toHaveBeenCalledWith('course');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('course.instructor', 'instructor');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('course.category', 'category');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('course.tags', 'tags');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('course.createdAt', 'DESC');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
    });

    it('should apply search filter', async () => {
      const query = { search: 'blockchain', page: 1, limit: 10 };
      
      await service.findElectiveCourses(query);
      
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(course.title) LIKE LOWER(:search) OR LOWER(course.description) LIKE LOWER(:search))',
        { search: '%blockchain%' }
      );
    });

    it('should apply category filter', async () => {
      const query = { category: 'Science', page: 1, limit: 10 };
      
      await service.findElectiveCourses(query);
      
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(category.name) = LOWER(:category)',
        { category: 'Science' }
      );
    });

    it('should apply credit hours filter', async () => {
      const query = { creditHours: 3, page: 1, limit: 10 };
      
      await service.findElectiveCourses(query);
      
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'course.durationInHours = :creditHours',
        { creditHours: 3 }
      );
    });

    it('should apply active status filter (true)', async () => {
      const query = { isActive: true, page: 1, limit: 10 };
      
      await service.findElectiveCourses(query);
      
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'course.status = :status',
        { status: 'published' }
      );
    });

    it('should apply active status filter (false)', async () => {
      const query = { isActive: false, page: 1, limit: 10 };
      
      await service.findElectiveCourses(query);
      
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'course.status = :status',
        { status: 'draft' }
      );
    });

    it('should apply multiple filters together', async () => {
      const query = {
        search: 'blockchain',
        category: 'Science',
        creditHours: 3,
        isActive: true,
        page: 2,
        limit: 5
      };
      
      await service.findElectiveCourses(query);
      
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4); // search, category, creditHours, isActive
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5); // (page 2 - 1) * limit 5
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('should handle pagination correctly', async () => {
      const query = { page: 3, limit: 20 };
      
      await service.findElectiveCourses(query);
      
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(40); // (page 3 - 1) * limit 20
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should return paginated results with correct structure', async () => {
      const mockCourses = [
        { id: '1', title: 'Course 1' },
        { id: '2', title: 'Course 2' }
      ];
      const mockTotal = 25;
      
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockCourses, mockTotal]);
      
      const result = await service.findElectiveCourses({ page: 1, limit: 10 });
      
      expect(result).toEqual({
        items: mockCourses,
        total: mockTotal,
        page: 1,
        limit: 10,
        totalPages: 3 // Math.ceil(25 / 10)
      });
    });
  });
});
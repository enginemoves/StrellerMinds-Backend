import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { CourseController } from './courses.controller';
import { CourseService } from './courses.service';
import { Course } from './entities/course.entity';
import { Category } from './entities/category.entity';
import { User } from '../users/entities/user.entity';
import { Tag } from './entities/tag.entity';

describe('Elective Courses Integration Tests', () => {
  let app: INestApplication;
  let courseRepository: Repository<Course>;
  let categoryRepository: Repository<Category>;
  let userRepository: Repository<User>;
  let tagRepository: Repository<Tag>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Course, Category, User, Tag],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Course, Category, User, Tag]),
      ],
      controllers: [CourseController],
      providers: [CourseService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    courseRepository = moduleFixture.get<Repository<Course>>('CourseRepository');
    categoryRepository = moduleFixture.get<Repository<Category>>('CategoryRepository');
    userRepository = moduleFixture.get<Repository<User>>('UserRepository');
    tagRepository = moduleFixture.get<Repository<Tag>>('TagRepository');
  });

  beforeEach(async () => {
    // Clear all tables before each test
    await courseRepository.clear();
    await categoryRepository.clear();
    await userRepository.clear();
    await tagRepository.clear();

    // Create test data
    const category = await categoryRepository.save({
      name: 'Science',
      description: 'Science courses',
    });

    const instructor = await userRepository.save({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });

    const tag = await tagRepository.save({
      name: 'blockchain',
      description: 'Blockchain technology',
    });

    // Create test courses
    await courseRepository.save([
      {
        title: 'Introduction to Blockchain',
        description: 'Learn the basics of blockchain technology',
        price: 99.99,
        durationInHours: 3,
        status: 'published',
        instructor: Promise.resolve(instructor),
        category: Promise.resolve(category),
        tags: Promise.resolve([tag]),
      },
      {
        title: 'Advanced Blockchain Development',
        description: 'Advanced concepts in blockchain development',
        price: 199.99,
        durationInHours: 5,
        status: 'published',
        instructor: Promise.resolve(instructor),
        category: Promise.resolve(category),
        tags: Promise.resolve([tag]),
      },
      {
        title: 'Data Science Fundamentals',
        description: 'Introduction to data science and analytics',
        price: 149.99,
        durationInHours: 3,
        status: 'draft',
        instructor: Promise.resolve(instructor),
        category: Promise.resolve(category),
        tags: Promise.resolve([]),
      },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /courses/elective-courses', () => {
    it('should return all courses with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses/elective-courses')
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body.items).toHaveLength(3);
    });

    it('should filter courses by search keyword', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses/elective-courses')
        .query({ search: 'blockchain' })
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[0].title).toContain('Blockchain');
    });

    it('should filter courses by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses/elective-courses')
        .query({ category: 'Science' })
        .expect(200);

      expect(response.body.items).toHaveLength(3);
      response.body.items.forEach(course => {
        expect(course.category.name).toBe('Science');
      });
    });

    it('should filter courses by credit hours', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses/elective-courses')
        .query({ creditHours: 3 })
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      response.body.items.forEach(course => {
        expect(course.durationInHours).toBe(3);
      });
    });

    it('should filter active courses only', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses/elective-courses')
        .query({ isActive: true })
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      response.body.items.forEach(course => {
        expect(course.status).toBe('published');
      });
    });

    it('should filter inactive courses only', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses/elective-courses')
        .query({ isActive: false })
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].status).toBe('draft');
    });

    it('should apply multiple filters together', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses/elective-courses')
        .query({
          search: 'blockchain',
          category: 'Science',
          creditHours: 3,
          isActive: true,
        })
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].title).toBe('Introduction to Blockchain');
      expect(response.body.items[0].durationInHours).toBe(3);
      expect(response.body.items[0].status).toBe('published');
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses/elective-courses')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
      expect(response.body.totalPages).toBe(2);
    });

    it('should return empty results when no courses match filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses/elective-courses')
        .query({ search: 'nonexistent' })
        .expect(200);

      expect(response.body.items).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('should validate query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses/elective-courses')
        .query({ page: -1, limit: 0 })
        .expect(400);

      expect(response.body.message).toContain('validation');
    });

    it('should handle case-insensitive search', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses/elective-courses')
        .query({ search: 'BLOCKCHAIN' })
        .expect(200);

      expect(response.body.items).toHaveLength(2);
    });

    it('should handle case-insensitive category filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses/elective-courses')
        .query({ category: 'science' })
        .expect(200);

      expect(response.body.items).toHaveLength(3);
    });
  });
});

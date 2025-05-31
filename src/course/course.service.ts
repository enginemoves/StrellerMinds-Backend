import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from './course.entity';
import { CreateCourseDto, UpdateCourseDto } from './course.dto';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    const course = this.courseRepository.create(createCourseDto);
    return this.courseRepository.save(course);
  }

  async findAll(): Promise<Course[]> {
    return this.courseRepository.find();
  }

  async findOne(id: number): Promise<Course> {
    const course = await this.courseRepository.findOneBy({ id });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    return course;
  }

  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.findOne(id);
    Object.assign(course, updateCourseDto);
    return this.courseRepository.save(course);
  }

  async remove(id: number): Promise<void> {
    const course = await this.findOne(id);
    await this.courseRepository.remove(course);
  }

  async bulkCreate(courses: CreateCourseDto[]): Promise<Course[]> {
    const createdCourses = this.courseRepository.create(courses);
    return this.courseRepository.save(createdCourses);
  }

  async bulkUpdate(courses: { id: number; data: UpdateCourseDto }[]): Promise<Course[]> {
    const updatedCourses: Course[] = [];

    for (const courseUpdate of courses) {
      const course = await this.findOne(courseUpdate.id);
      Object.assign(course, courseUpdate.data);
      updatedCourses.push(course);
    }

    return this.courseRepository.save(updatedCourses);
  }

  async bulkDelete(ids: number[]): Promise<void> {
    const courses = await this.courseRepository.findByIds(ids);
    await this.courseRepository.remove(courses);
  }

  async getCourseAnalytics() {
    const [total, published, draft, archived] = await Promise.all([
      this.courseRepository.count(),
      this.courseRepository.count({ where: { status: 'published' } }),
      this.courseRepository.count({ where: { status: 'draft' } }),
      this.courseRepository.count({ where: { status: 'archived' } }),
    ]);

    return {
      total,
      published,
      draft,
      archived,
    };
  }

  // New: Update course status only
  async updateStatus(id: number, status: string): Promise<Course> {
    const course = await this.findOne(id);
    course.status = status;
    return this.courseRepository.save(course);
  }

  // New: Find courses by status
  async findByStatus(status: string): Promise<Course[]> {
    return this.courseRepository.find({ where: { status } });
  }
} 

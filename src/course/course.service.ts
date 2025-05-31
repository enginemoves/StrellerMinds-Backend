import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from './course.entity';
import { CreateCourseDto, UpdateCourseDto } from './course.dto';

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    this.logger.log(`Creating a new course with title: ${createCourseDto.title}`);
    const course = this.courseRepository.create(createCourseDto);
    const result = await this.courseRepository.save(course);
    this.logger.log(`Course created with ID: ${result.id}`);
    return result;
  }

  async findAll(): Promise<Course[]> {
    this.logger.log('Fetching all courses');
    return this.courseRepository.find();
  }

  async findOne(id: number): Promise<Course> {
    this.logger.log(`Fetching course with ID: ${id}`);
    const course = await this.courseRepository.findOneBy({ id });
    if (!course) {
      this.logger.error(`Course with ID: ${id} not found`);
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    return course;
  }

  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<Course> {
    this.logger.log(`Updating course with ID: ${id}`);
    const course = await this.findOne(id);
    Object.assign(course, updateCourseDto);
    const updated = await this.courseRepository.save(course);
    this.logger.log(`Course with ID: ${id} updated`);
    return updated;
  }

  async remove(id: number): Promise<void> {
    this.logger.log(`Deleting course with ID: ${id}`);
    const course = await this.findOne(id);
    await this.courseRepository.remove(course);
    this.logger.log(`Course with ID: ${id} deleted`);
  }

  async bulkCreate(courses: CreateCourseDto[]): Promise<Course[]> {
    this.logger.log(`Bulk creating ${courses.length} courses`);
    const createdCourses = this.courseRepository.create(courses);
    const result = await this.courseRepository.save(createdCourses);
    this.logger.log(`Bulk creation completed: ${result.length} courses created`);
    return result;
  }

  async bulkUpdate(courses: { id: number; data: UpdateCourseDto }[]): Promise<Course[]> {
    this.logger.log(`Bulk updating ${courses.length} courses`);
    const updatedCourses: Course[] = [];
    for (const courseUpdate of courses) {
      const course = await this.findOne(courseUpdate.id);
      Object.assign(course, courseUpdate.data);
      updatedCourses.push(course);
    }
    const result = await this.courseRepository.save(updatedCourses);
    this.logger.log(`Bulk update completed: ${result.length} courses updated`);
    return result;
  }

  async bulkDelete(ids: number[]): Promise<void> {
    this.logger.log(`Bulk deleting courses with IDs: ${ids.join(', ')}`);
    const courses = await this.courseRepository.findByIds(ids);
    await this.courseRepository.remove(courses);
    this.logger.log(`Bulk deletion completed`);
  }

  async getCourseAnalytics() {
    this.logger.log('Calculating course analytics');
    const [total, published, draft, archived] = await Promise.all([
      this.courseRepository.count(),
      this.courseRepository.count({ where: { status: 'published' } }),
      this.courseRepository.count({ where: { status: 'draft' } }),
      this.courseRepository.count({ where: { status: 'archived' } }),
    ]);
    const analytics = {
      total,
      published,
      draft,
      archived,
    };
    this.logger.log(`Analytics calculated: ${JSON.stringify(analytics)}`);
    return analytics;
  }

  // New: Update course status only
  async updateStatus(id: number, status: string): Promise<Course> {
    this.logger.log(`Updating status for course ID: ${id} to ${status}`);
    const course = await this.findOne(id);
    course.status = status;
    const updated = await this.courseRepository.save(course);
    this.logger.log(`Course ID: ${id} status updated to ${status}`);
    return updated;
  }

  // New: Find courses by status
  async findByStatus(status: string): Promise<Course[]> {
    this.logger.log(`Fetching courses with status: ${status}`);
    return this.courseRepository.find({ where: { status } });
  }
}

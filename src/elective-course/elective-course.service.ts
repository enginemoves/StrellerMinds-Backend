import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElectiveCourse } from './entities/elective-course.entity';
import { CreateElectiveCourseDto } from './dto/create-elective-course.dto';
import { UpdateElectiveCourseDto } from './dto/update-elective-course.dto';

@Injectable()
export class ElectiveCourseService {
  constructor(
    @InjectRepository(ElectiveCourse)
    private readonly electiveCourseRepository: Repository<ElectiveCourse>,
  ) {}

  async createCourse(dto: CreateElectiveCourseDto): Promise<ElectiveCourse> {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new BadRequestException('Title is required');
    }
    if (dto.creditHours == null || dto.creditHours <= 0) {
      throw new BadRequestException('creditHours must be greater than 0');
    }
    const entity = this.electiveCourseRepository.create(dto);
    return await this.electiveCourseRepository.save(entity);
  }

  async getAllCourses(): Promise<ElectiveCourse[]> {
    return await this.electiveCourseRepository.find();
  }

  async getCourseById(id: string): Promise<ElectiveCourse> {
    const found = await this.electiveCourseRepository.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Elective course not found');
    return found;
  }

  async updateCourse(id: string, dto: UpdateElectiveCourseDto): Promise<ElectiveCourse> {
    const course = await this.getCourseById(id);
    if (dto.title !== undefined && dto.title.trim().length === 0) {
      throw new BadRequestException('Title cannot be empty');
    }
    if (dto.creditHours !== undefined && dto.creditHours <= 0) {
      throw new BadRequestException('creditHours must be greater than 0');
    }
    const updated = Object.assign(course, dto);
    return await this.electiveCourseRepository.save(updated);
  }

  async deleteCourse(id: string): Promise<void> {
    const result = await this.electiveCourseRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Elective course not found');
    }
  }
}



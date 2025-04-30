import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateCourseDto } from "src/courses/dtos/create.course.dto";
import { UpdateCourseDto } from "src/courses/dtos/update.course.dto";
import { Course } from "src/courses/entities/course.entity";
import { Repository } from "typeorm";

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
  ) {}

  create(createDto: CreateCourseDto) {
    const course = this.courseRepo.create(createDto);
    return this.courseRepo.save(course);
  }

  findAll() {
    return this.courseRepo.find();
  }

  findOne(id: string) {
    return this.courseRepo.findOne({ where: { id } });
  }

  async update(id: string, updateDto: UpdateCourseDto) {
    await this.courseRepo.update(id, updateDto);
    return this.courseRepo.findOne({ where: { id } });
  }

  remove(id: string) {
    return this.courseRepo.delete(id);
  }
}

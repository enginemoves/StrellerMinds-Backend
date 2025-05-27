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
    // Omit 'modules' property to avoid type incompatibility
    const { modules, ...rest } = createDto as any;
    const course = this.courseRepo.create(rest);
    return this.courseRepo.save(course);
  }

  findAll() {
    return this.courseRepo.find();
  }

  findOne(id: string) {
    return this.courseRepo.findOne({ where: { id } });
  }

  async update(id: string, updateDto: UpdateCourseDto) {
    // Omit 'modules' property when updating, as TypeORM cannot update relations this way
    const { modules, ...rest } = updateDto as any;
    await this.courseRepo.update(id, rest);
    return this.courseRepo.findOne({ where: { id } });
  }

  remove(id: string) {
    return this.courseRepo.delete(id);
  }
}

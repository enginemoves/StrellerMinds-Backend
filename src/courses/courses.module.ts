import { Module } from '@nestjs/common';

/**
 * CoursesModule provides course management features.
 *
 * @module Courses
 */
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CourseModule } from './entities/course-module.entity';
import { Category } from './entities/category.entity';
import { Tag } from './entities/tag.entity';
import { CourseReview } from './entities/course-review.entity';
import { CourseService } from './courses.service';
import { CourseController } from './courses.controller';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/email/email.module';
import { Lesson } from 'src/lesson/entity/lesson.entity';
// import { Lesson } from 'src/modules/lesson/entities/lesson.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseModule,
      Category,
      Tag,
      CourseReview,
      User,
      Lesson,
    ]),
    UsersModule,
    EmailModule,
  ],
  providers: [CourseService],
  controllers: [CourseController],
  exports: [CourseService],
})
export class CoursesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserProgress } from './entities/user-progress.entity';
import { ProgressService } from './services/progress.service';
import { ProgressController } from './controllers/progress.controller';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../lesson/entity/lesson.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProgress, Course, Lesson]),
  ],
  controllers: [UsersController, ProgressController],
  providers: [UsersService, ProgressService],
  exports: [UsersService, ProgressService],
})
export class UsersModule {}




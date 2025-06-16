import { Module } from '@nestjs/common';
import { UserProgressController } from './controllers/user-progress.controller';
import { UserProgressService } from './services/user-progress.service';
// Import your database modules, repositories, etc.
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { User } from './entities/user.entity';
// import { Course } from './entities/course.entity';
// import { Enrollment } from './entities/enrollment.entity';
// import { Activity } from './entities/activity.entity';

@Module({
  // imports: [
  //   TypeOrmModule.forFeature([User, Course, Enrollment, Activity])
  // ],
  controllers: [UserProgressController],
  providers: [UserProgressService],
  exports: [UserProgressService]
})
export class UserProgressModule {}
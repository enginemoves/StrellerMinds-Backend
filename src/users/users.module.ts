import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller'; // Corrected import
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { WalletInfo } from './entities/wallet-info.entity';
import { UserProgress } from './entities/user-progress.entity';
import { ProgressService } from './services/progress.service';
import { ProgressController } from './controllers/progress.controller';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../lesson/entity/lesson.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, WalletInfo, UserProgress, Course, Lesson]),
  ],
  controllers: [UsersController, ProgressController], // Corrected controller
  providers: [UsersService, CloudinaryService, ProgressService],
  exports: [UsersService, ProgressService],
})
export class UsersModule {}
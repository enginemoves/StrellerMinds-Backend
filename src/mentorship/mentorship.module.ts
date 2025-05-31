import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MentorshipController } from './controllers/mentorship.controller';
import { MentorshipService } from './services/mentorship.service';
import { MatchingService } from './services/matching.service';
import { MentorshipPreference } from './entities/mentorship-preference.entity';
import { MentorshipMatch } from './entities/mentorship-match.entity';
import { MentorAvailability } from './entities/mentor-availability.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MentorshipPreference,
      MentorshipMatch,
      MentorAvailability,
    ]),
    NotificationsModule,
    UsersModule,
  ],
  controllers: [MentorshipController],
  providers: [MentorshipService, MatchingService],
  exports: [MentorshipService, MatchingService],
})
export class MentorshipModule {}

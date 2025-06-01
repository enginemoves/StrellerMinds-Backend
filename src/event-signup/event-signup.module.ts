import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventSignup } from './entities/event-signup.entity';
import { EventsService } from './services/events.service';
import { EventSignupsService } from './services/event-signups.service';
import { EventsController } from './controllers/events.controller';
import { EventSignupsController } from './controllers/event-signups.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventSignup]), NotificationModule],
  controllers: [EventsController, EventSignupsController],
  providers: [EventsService, EventSignupsService],
  exports: [EventsService, EventSignupsService],
})
export class EventSignupModule {}

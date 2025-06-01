import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { EventSignupsService } from '../services/event-signups.service';
import { SignupEventDto } from '../dto/signup-event.dto';
import { EventSignup } from '../entities/event-signup.entity';

@Controller('event-signups')
export class EventSignupsController {
  constructor(private readonly eventSignupsService: EventSignupsService) {}

  @Post()
  async signupForEvent(
    @Body() signupDto: SignupEventDto,
  ): Promise<EventSignup> {
    return this.eventSignupsService.signupForEvent(signupDto);
  }

  @Delete(':eventId/users/:userId')
  async cancelSignup(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<{ message: string }> {
    await this.eventSignupsService.cancelSignup(eventId, userId);
    return { message: 'Signup cancelled successfully' };
  }

  @Get('users/:userId')
  async getUserSignups(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<EventSignup[]> {
    return this.eventSignupsService.getUserSignups(userId);
  }

  @Get('events/:eventId')
  async getEventSignups(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<EventSignup[]> {
    return this.eventSignupsService.getEventSignups(eventId);
  }

  @Get('my-signups')
  async getMySignups(@Request() req): Promise<EventSignup[]> {
    return this.eventSignupsService.getUserSignups(req.user.id);
  }
}

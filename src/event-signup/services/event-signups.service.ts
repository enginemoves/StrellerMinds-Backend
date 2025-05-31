import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventSignup, SignupStatus } from '../entities/event-signup.entity';
import { Event } from '../entities/event.entity';
import { SignupEventDto } from '../dto/signup-event.dto';
import { EventsService } from './events.service';
import { NotificationsService } from '../../notification/notification.service';

@Injectable()
export class EventSignupsService {
  constructor(
    @InjectRepository(EventSignup)
    private readonly signupsRepository: Repository<EventSignup>,
    private readonly eventsService: EventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async signupForEvent(signupDto: SignupEventDto): Promise<EventSignup> {
    const { eventId, userId } = signupDto;

    // Check if event exists
    const event = await this.eventsService.findOne(eventId);

    // Check if user already signed up
    const existingSignup = await this.signupsRepository.findOne({
      where: { eventId, userId, status: SignupStatus.CONFIRMED },
    });

    if (existingSignup) {
      throw new BadRequestException('User already signed up for this event');
    }

    let signup: EventSignup;

    // Check if event has capacity
    if (event.currentSignups >= event.capacity) {
      if (!event.allowWaitlist) {
        throw new BadRequestException(
          'Event is full and waitlist is not allowed',
        );
      }

      // Add to waitlist
      const waitlistPosition = await this.getNextWaitlistPosition(eventId);
      signup = this.signupsRepository.create({
        eventId,
        userId,
        status: SignupStatus.WAITLISTED,
        waitlistPosition,
        signupDate: new Date(),
      });

      // Send waitlist notification
      await this.notificationsService.create({
        title: 'Event Waitlist',
        message: `You have been added to the waitlist for "${event.title}". Your position is ${waitlistPosition}.`,
        type: 'event_waitlist',
        userId,
        metadata: { eventId, waitlistPosition },
      });
    } else {
      // Confirm signup
      signup = this.signupsRepository.create({
        eventId,
        userId,
        status: SignupStatus.CONFIRMED,
        signupDate: new Date(),
      });

      await this.eventsService.incrementSignupCount(eventId);

      // Send confirmation notification
      await this.notificationsService.create({
        title: 'Event Signup Confirmed',
        message: `Your signup for "${event.title}" has been confirmed.`,
        type: 'event_signup_confirmed',
        userId,
        metadata: { eventId },
      });
    }

    return this.signupsRepository.save(signup);
  }

  async cancelSignup(eventId: string, userId: string): Promise<void> {
    const signup = await this.signupsRepository.findOne({
      where: { eventId, userId, status: SignupStatus.CONFIRMED },
    });

    if (!signup) {
      throw new NotFoundException('Signup not found or already cancelled');
    }

    // Cancel the signup
    signup.status = SignupStatus.CANCELLED;
    signup.cancellationDate = new Date();
    await this.signupsRepository.save(signup);

    await this.eventsService.decrementSignupCount(eventId);

    // Promote someone from waitlist if available
    await this.promoteFromWaitlist(eventId);

    const event = await this.eventsService.findOne(eventId);

    // Send cancellation notification
    await this.notificationsService.create({
      title: 'Event Signup Cancelled',
      message: `Your signup for "${event.title}" has been cancelled.`,
      type: 'event_signup_cancelled',
      userId,
      metadata: { eventId },
    });
  }

  async getUserSignups(userId: string): Promise<EventSignup[]> {
    return this.signupsRepository.find({
      where: { userId },
      relations: ['event'],
      order: { createdAt: 'DESC' },
    });
  }

  async getEventSignups(eventId: string): Promise<EventSignup[]> {
    return this.signupsRepository.find({
      where: { eventId },
      relations: ['user'],
      order: { signupDate: 'ASC' },
    });
  }

  private async getNextWaitlistPosition(eventId: string): Promise<number> {
    const lastWaitlistSignup = await this.signupsRepository.findOne({
      where: { eventId, status: SignupStatus.WAITLISTED },
      order: { waitlistPosition: 'DESC' },
    });

    return lastWaitlistSignup ? lastWaitlistSignup.waitlistPosition + 1 : 1;
  }

  private async promoteFromWaitlist(eventId: string): Promise<void> {
    const nextWaitlistSignup = await this.signupsRepository.findOne({
      where: { eventId, status: SignupStatus.WAITLISTED },
      order: { waitlistPosition: 'ASC' },
    });

    if (nextWaitlistSignup) {
      nextWaitlistSignup.status = SignupStatus.CONFIRMED;
      nextWaitlistSignup.waitlistPosition = null;
      nextWaitlistSignup.signupDate = new Date();

      await this.signupsRepository.save(nextWaitlistSignup);
      await this.eventsService.incrementSignupCount(eventId);

      const event = await this.eventsService.findOne(eventId);

      // Send promotion notification
      await this.notificationsService.create({
        title: 'Promoted from Waitlist',
        message: `Great news! You've been promoted from the waitlist and your signup for "${event.title}" is now confirmed.`,
        type: 'event_waitlist_promoted',
        userId: nextWaitlistSignup.userId,
        metadata: { eventId },
      });
    }
  }
}

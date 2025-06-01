import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventSignupsService } from '../event-signups.service';
import { EventSignup, SignupStatus } from '../../entities/event-signup.entity';
import { EventsService } from '../events.service';
import { NotificationsService } from '../../../notification/notification.service';
import { BadRequestException } from '@nestjs/common';

describe('EventSignupsService', () => {
  let service: EventSignupsService;
  let signupsRepository: Repository<EventSignup>;
  let eventsService: EventsService;
  let notificationsService: NotificationsService;

  const mockSignupsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockEventsService = {
    findOne: jest.fn(),
    incrementSignupCount: jest.fn(),
    decrementSignupCount: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventSignupsService,
        {
          provide: getRepositoryToken(EventSignup),
          useValue: mockSignupsRepository,
        },
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<EventSignupsService>(EventSignupsService);
    signupsRepository = module.get<Repository<EventSignup>>(
      getRepositoryToken(EventSignup),
    );
    eventsService = module.get<EventsService>(EventsService);
    notificationsService =
      module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signupForEvent', () => {
    it('should successfully signup user for event with available capacity', async () => {
      const signupDto = { eventId: '123', userId: '456' };
      const mockEvent = {
        id: '123',
        title: 'Test Event',
        capacity: 50,
        currentSignups: 10,
        allowWaitlist: true,
      };

      const mockSignup = {
        id: '789',
        eventId: '123',
        userId: '456',
        status: SignupStatus.CONFIRMED,
        signupDate: new Date(),
      };

      mockEventsService.findOne.mockResolvedValue(mockEvent);
      mockSignupsRepository.findOne.mockResolvedValue(null);
      mockSignupsRepository.create.mockReturnValue(mockSignup);
      mockSignupsRepository.save.mockResolvedValue(mockSignup);

      const result = await service.signupForEvent(signupDto);

      expect(mockEventsService.findOne).toHaveBeenCalledWith('123');
      expect(mockEventsService.incrementSignupCount).toHaveBeenCalledWith(
        '123',
      );
      expect(mockNotificationsService.create).toHaveBeenCalled();
      expect(result).toEqual(mockSignup);
    });

    it('should throw BadRequestException if user already signed up', async () => {
      const signupDto = { eventId: '123', userId: '456' };
      const mockEvent = { id: '123', title: 'Test Event' };
      const existingSignup = { id: '789', status: SignupStatus.CONFIRMED };

      mockEventsService.findOne.mockResolvedValue(mockEvent);
      mockSignupsRepository.findOne.mockResolvedValue(existingSignup);

      await expect(service.signupForEvent(signupDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

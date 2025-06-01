import { Test, TestingModule } from '@nestjs/testing';
import { EventSignupsController } from '../event-signups.controller';
import { EventSignupsService } from '../../services/event-signups.service';

describe('EventSignupsController', () => {
  let controller: EventSignupsController;
  let service: EventSignupsService;

  const mockEventSignupsService = {
    signupForEvent: jest.fn(),
    cancelSignup: jest.fn(),
    getUserSignups: jest.fn(),
    getEventSignups: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventSignupsController],
      providers: [
        {
          provide: EventSignupsService,
          useValue: mockEventSignupsService,
        },
      ],
    }).compile();

    controller = module.get<EventSignupsController>(EventSignupsController);
    service = module.get<EventSignupsService>(EventSignupsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signupForEvent', () => {
    it('should signup user for event', async () => {
      const signupDto = { eventId: '123', userId: '456' };
      const mockSignup = { id: '789', ...signupDto };

      mockEventSignupsService.signupForEvent.mockResolvedValue(mockSignup);

      const result = await controller.signupForEvent(signupDto);

      expect(service.signupForEvent).toHaveBeenCalledWith(signupDto);
      expect(result).toEqual(mockSignup);
    });
  });
});

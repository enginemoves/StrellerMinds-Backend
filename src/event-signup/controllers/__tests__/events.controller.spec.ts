import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from '../events.controller';
import { EventsService } from '../../services/events.service';

describe('EventsController', () => {
  let controller: EventsController;
  let service: EventsService;

  const mockEventsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getActiveEvents: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new event', async () => {
      const createEventDto = {
        title: 'Test Event',
        description: 'Test Description',
        startDate: '2024-12-01T10:00:00Z',
        endDate: '2024-12-01T12:00:00Z',
        location: 'Test Location',
        capacity: 50,
      };

      const mockEvent = { id: '123', ...createEventDto };
      mockEventsService.create.mockResolvedValue(mockEvent);

      const result = await controller.create(createEventDto);

      expect(service.create).toHaveBeenCalledWith(createEventDto);
      expect(result).toEqual(mockEvent);
    });
  });
});

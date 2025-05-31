import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventsService } from '../events.service';
import { Event } from '../../entities/event.entity';
import { NotFoundException } from '@nestjs/common';

describe('EventsService', () => {
  let service: EventsService;
  let repository: Repository<Event>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    repository = module.get<Repository<Event>>(getRepositoryToken(Event));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

      const mockEvent = {
        id: '123',
        ...createEventDto,
        startDate: new Date(createEventDto.startDate),
        endDate: new Date(createEventDto.endDate),
        currentSignups: 0,
        isActive: true,
        allowWaitlist: false,
      };

      mockRepository.create.mockReturnValue(mockEvent);
      mockRepository.save.mockResolvedValue(mockEvent);

      const result = await service.create(createEventDto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createEventDto,
        startDate: new Date(createEventDto.startDate),
        endDate: new Date(createEventDto.endDate),
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockEvent);
    });
  });

  describe('findOne', () => {
    it('should return an event if found', async () => {
      const eventId = '123';
      const mockEvent = { id: eventId, title: 'Test Event' };

      mockRepository.findOne.mockResolvedValue(mockEvent);

      const result = await service.findOne(eventId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: eventId },
        relations: ['signups', 'signups.user'],
      });
      expect(result).toEqual(mockEvent);
    });

    it('should throw NotFoundException if event not found', async () => {
      const eventId = '123';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(eventId)).rejects.toThrow(NotFoundException);
    });
  });
});

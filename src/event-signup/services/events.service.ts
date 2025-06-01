import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const event = this.eventsRepository.create({
      ...createEventDto,
      startDate: new Date(createEventDto.startDate),
      endDate: new Date(createEventDto.endDate),
    });
    return this.eventsRepository.save(event);
  }

  async findAll(): Promise<Event[]> {
    return this.eventsRepository.find({
      relations: ['signups'],
      order: { startDate: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: ['signups', 'signups.user'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);

    const updateData = { ...updateEventDto };
    if (updateEventDto.startDate) {
      updateData.startDate = new Date(updateEventDto.startDate);
    }
    if (updateEventDto.endDate) {
      updateData.endDate = new Date(updateEventDto.endDate);
    }

    await this.eventsRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);
    await this.eventsRepository.remove(event);
  }

  async getActiveEvents(): Promise<Event[]> {
    return this.eventsRepository.find({
      where: { isActive: true },
      relations: ['signups'],
      order: { startDate: 'ASC' },
    });
  }

  async incrementSignupCount(eventId: string): Promise<void> {
    await this.eventsRepository.increment({ id: eventId }, 'currentSignups', 1);
  }

  async decrementSignupCount(eventId: string): Promise<void> {
    await this.eventsRepository.decrement({ id: eventId }, 'currentSignups', 1);
  }
}

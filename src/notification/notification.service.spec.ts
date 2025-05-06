import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

const mockNotification = {
  id: 'uuid-123',
  title: 'New Notification',
  message: 'This is a test',
  isRead: false,
  type: 'course_update',
  metadata: { courseId: 'abc123' },
  createdAt: new Date(),
  user: { id: 'user-uuid' },
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: Repository<Notification>;

  const mockRepository = {
    create: jest.fn().mockReturnValue(mockNotification),
    save: jest.fn().mockResolvedValue(mockNotification),
    find: jest.fn().mockResolvedValue([mockNotification]),
    findOne: jest.fn().mockResolvedValue(mockNotification),
    update: jest.fn(),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repo = module.get<Repository<Notification>>(getRepositoryToken(Notification));
  });

  it('should create a notification', async () => {
    const dto = { title: 'New', type: 'course_update', userId: 'user-uuid' };
    await expect(service.create(dto as any)).resolves.toEqual(mockNotification);
  });

  it('should return all notifications', async () => {
    await expect(service.findAll()).resolves.toEqual([mockNotification]);
  });

  it('should return one notification', async () => {
    await expect(service.findOne('uuid-123')).resolves.toEqual(mockNotification);
  });

  it('should throw if notification not found', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue(null);
    await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
  });

  it('should update and return the notification', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(mockNotification as Notification);
    await expect(service.update('uuid-123', { title: 'Updated' })).resolves.toEqual(mockNotification);
  });

  it('should delete the notification', async () => {
    await expect(service.remove('uuid-123')).resolves.toBeUndefined();
  });

  it('should throw when trying to delete a non-existing notification', async () => {
    jest.spyOn(repo, 'delete').mockResolvedValue({ affected: 0 });
    await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
  });
});

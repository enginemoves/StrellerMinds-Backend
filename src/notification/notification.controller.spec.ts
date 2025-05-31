import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notification.controller';
import { NotificationsService } from './notification.service';
import { Notification } from './entities/notification.entity';

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

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockService = {
    create: jest.fn().mockResolvedValue(mockNotification),
    findAll: jest.fn().mockResolvedValue([mockNotification]),
    findOne: jest.fn().mockResolvedValue(mockNotification),
    update: jest.fn().mockResolvedValue(mockNotification),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should create a notification', async () => {
    const dto = { title: 'New', type: 'course_update', userId: 'user-uuid' };
    await expect(controller.create(dto as any)).resolves.toEqual(mockNotification);
  });

  it('should get all notifications', async () => {
    await expect(controller.findAll()).resolves.toEqual([mockNotification]);
  });

  it('should get one notification', async () => {
    await expect(controller.findOne('uuid-123')).resolves.toEqual(mockNotification);
  });

  it('should update a notification', async () => {
    await expect(
      controller.update('uuid-123', { title: 'Updated' }),
    ).resolves.toEqual(mockNotification);
  });

  it('should delete a notification', async () => {
    await expect(controller.remove('uuid-123')).resolves.toBeUndefined();
  });
});

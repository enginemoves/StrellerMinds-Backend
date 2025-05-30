import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackService } from './feedback.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Feedback } from './entities/feedback.entity';
import { Repository } from 'typeorm';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { NotificationsService } from 'src/notification/notification.service';

const mockFeedbackRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  softDelete: jest.fn(),
});

const mockNotificationService = {
  notifyUser: jest.fn(),
};

describe('FeedbackService', () => {
  let service: FeedbackService;
  let feedbackRepo: Repository<Feedback>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: getRepositoryToken(Feedback),
          useFactory: mockFeedbackRepo,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    feedbackRepo = module.get<Repository<Feedback>>(getRepositoryToken(Feedback));
  });

  it('should create feedback and notify recipient', async () => {
    const dto: CreateFeedbackDto = {
      recipientId: 'user-b',
      content: 'Great job!',
      isAnonymous: false,
    };
    const senderId = 'user-a';
    const savedFeedback = { ...dto, senderId };

    (feedbackRepo.create as jest.Mock).mockReturnValue(savedFeedback);
    (feedbackRepo.save as jest.Mock).mockResolvedValue(savedFeedback);

    const result = await service.create(senderId, dto);

    expect(feedbackRepo.create).toHaveBeenCalledWith({
      ...dto,
      senderId: senderId,
    });
    expect(feedbackRepo.save).toHaveBeenCalledWith(savedFeedback);
    expect(mockNotificationService.notifyUser).toHaveBeenCalledWith(
      dto.recipientId,
      expect.stringContaining('feedback'),
    );
    expect(result).toEqual(savedFeedback);
  });

  it('should return feedback for recipient', async () => {
    const feedbacks = [{ id: '1' }, { id: '2' }];
    (feedbackRepo.find as jest.Mock).mockResolvedValue(feedbacks);

    const result = await service.getByRecipient('user-b');
    expect(result).toEqual(feedbacks);
  });

  it('should flag feedback', async () => {
    const feedback = { id: '1', isFlagged: false };
    (feedbackRepo.findOne as jest.Mock).mockResolvedValue(feedback);
    (feedbackRepo.save as jest.Mock).mockResolvedValue({ ...feedback, isFlagged: true });

    const result = await service.flagFeedback('1');
    expect(result.isFlagged).toBe(true);
  });

  it('should delete flagged feedback', async () => {
    (feedbackRepo.softDelete as jest.Mock).mockResolvedValue({ affected: 1 });

    await expect(service.removeFlagged('1')).resolves.not.toThrow();
  });

  it('should throw error if flagged feedback not found', async () => {
    (feedbackRepo.softDelete as jest.Mock).mockResolvedValue({ affected: 0 });

    await expect(service.removeFlagged('999')).rejects.toThrow();
  });
});

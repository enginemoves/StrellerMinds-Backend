import { Test, TestingModule } from '@nestjs/testing';
import { TopicController } from './topic.controller';
import { TopicService } from './topic.service';
import { CreateForumTopicDto } from './dto/create-topic.dto';

describe('TopicController', () => {
  let controller: TopicController;
  let service: TopicService;

  const mockTopicService = {
    createTopic: jest.fn(),
    findTopicsByCategory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TopicController],
      providers: [
        {
          provide: TopicService,
          useValue: mockTopicService,
        },
      ],
    }).compile();

    controller = module.get<TopicController>(TopicController);
    service = module.get<TopicService>(TopicService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createTopic', () => {
    it('should call service and return created topic', async () => {
      const dto: CreateForumTopicDto = {
        title: 'New Topic',
        categoryId: '1',
        userId: '2',
      };

      const result = { id: '3', ...dto };
      mockTopicService.createTopic.mockResolvedValue(result);

      const req = { user: { id: '2' } } as any;

      expect(await controller.createTopic(dto, req)).toEqual(result);
      expect(service.createTopic).toHaveBeenCalledWith(dto);
    });
  });

  describe('findTopicsByCategory', () => {
    it('should return topics for category', async () => {
      const topics = [{ title: 'Topic 1' }];
      mockTopicService.findTopicsByCategory.mockResolvedValue(topics);

      expect(await controller.findTopicsByCategory('1')).toEqual(topics);
      expect(service.findTopicsByCategory).toHaveBeenCalledWith('1');
    });
  });
});

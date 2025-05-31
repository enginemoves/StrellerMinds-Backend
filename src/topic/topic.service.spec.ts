import { Test, TestingModule } from '@nestjs/testing';
import { TopicService } from './topic.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForumTopic } from './entities/forum-topic.entity';
import { Repository } from 'typeorm';
import { CreateForumTopicDto } from './dto/create-topic.dto';
import { ForumCategory } from 'src/catogory/entities/forum-category.entity';
import { User } from 'src/users/entities/user.entity';

describe('TopicService', () => {
  let service: TopicService;
  let topicRepository: Repository<ForumTopic>;

  const mockTopicRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    manager: {
      findOne: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicService,
        {
          provide: getRepositoryToken(ForumTopic),
          useValue: mockTopicRepository,
        },
      ],
    }).compile();

    service = module.get<TopicService>(TopicService);
    topicRepository = module.get(getRepositoryToken(ForumTopic));
  });

  afterEach(() => jest.clearAllMocks());

  describe('createTopic', () => {
    it('should throw error if category not found', async () => {
      mockTopicRepository.manager.findOne
        .mockResolvedValueOnce(null); // category

      const dto: CreateForumTopicDto = {
        title: 'New Topic',
        categoryId: '1',
        userId: '2',
        isPinned: false,
        isClosed: false,
      };

      await expect(service.createTopic(dto)).rejects.toThrow('Category not found');
    });

    it('should throw error if user not found', async () => {
      mockTopicRepository.manager.findOne
        .mockResolvedValueOnce({}) // category
        .mockResolvedValueOnce(null); // user

      const dto: CreateForumTopicDto = {
        title: 'New Topic',
        categoryId: '1',
        userId: '2',
      };

      await expect(service.createTopic(dto)).rejects.toThrow('User not found');
    });

    it('should create and return topic', async () => {
      const category = { id: '1' } as ForumCategory;
      const user = { id: '2' } as User;
      const topic = { id: '3', title: 'New Topic' } as ForumTopic;

      mockTopicRepository.manager.findOne
        .mockResolvedValueOnce(category) // category
        .mockResolvedValueOnce(user); // user

      mockTopicRepository.create.mockReturnValue(topic);
      mockTopicRepository.save.mockResolvedValue(topic);

      const result = await service.createTopic({
        title: 'New Topic',
        categoryId: '1',
        userId: '2',
      });

      expect(result).toEqual(topic);
    });
  });

  describe('findTopicsByCategory', () => {
    it('should return list of topics', async () => {
      const topics = [{ title: 'Topic 1' }] as ForumTopic[];
      mockTopicRepository.find.mockResolvedValue(topics);

      const result = await service.findTopicsByCategory('1');
      expect(result).toEqual(topics);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ForumsService } from './forum.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForumCategory } from '../catogory/entities/forum-category.entity';
import { ForumTopic } from '../topic/entities/forum-topic.entity';
import { ForumPost } from '../post/entities/forum-post.entity';
import { ForumComment } from './entities/forum-comment.entity';
import { Repository } from 'typeorm';

describe('ForumsService', () => {
  let service: ForumsService;
  let categoryRepo: Repository<ForumCategory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForumsService,
        {
          provide: getRepositoryToken(ForumCategory),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ForumTopic),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ForumPost),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ForumComment),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<ForumsService>(ForumsService);
    categoryRepo = module.get<Repository<ForumCategory>>(getRepositoryToken(ForumCategory));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCategory', () => {
    it('should create and return a forum category', async () => {
      const dto = { name: 'General Discussion' };
      const expected = { id: 'uuid', ...dto };

      jest.spyOn(categoryRepo, 'create').mockReturnValue(expected as any);
      jest.spyOn(categoryRepo, 'save').mockResolvedValue(expected as any);

      const result = await service.createCategory(dto);
      expect(result).toEqual(expected);
    });
  });
});

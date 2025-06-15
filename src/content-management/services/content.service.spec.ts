import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentService } from '../../src/content/services/content.service';
import { Content } from '../../src/content/entities/content.entity';
import { ContentVersion } from '../../src/content/entities/content-version.entity';
import { ContentMedia } from '../../src/content/entities/content-media.entity';
import { ContentType, ContentStatus } from '../../src/content/enums/content.enum';
import { ContentNotFoundException } from '../../src/content/exceptions/content.exceptions';

describe('ContentService', () => {
  let service: ContentService;
  let contentRepository: Repository<Content>;
  let versionRepository: Repository<ContentVersion>;
  let mediaRepository: Repository<ContentMedia>;

  const mockContent = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Content',
    description: 'Test Description',
    type: ContentType.TEXT,
    status: ContentStatus.DRAFT,
    content: { text: 'Sample content' },
    createdBy: 'user123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: getRepositoryToken(Content),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ContentVersion),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ContentMedia),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    contentRepository = module.get<Repository<Content>>(getRepositoryToken(Content));
    versionRepository = module.get<Repository<ContentVersion>>(getRepositoryToken(ContentVersion));
    mediaRepository = module.get<Repository<ContentMedia>>(getRepositoryToken(ContentMedia));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create content successfully', async () => {
      const createDto = {
        title: 'Test Content',
        type: ContentType.TEXT,
        createdBy: 'user123',
      };

      mockRepository.create.mockReturnValue(mockContent);
      mockRepository.save.mockResolvedValue(mockContent);
      mockRepository.findOne.mockResolvedValue(null); // No existing version

      const result = await service.create(createDto);

      expect(contentRepository.create).toHaveBeenCalledWith(createDto);
      expect(contentRepository.save).toHaveBeenCalledWith(mockContent);
      expect(result).toEqual(mockContent);
    });

    it('should throw error for invalid scheduled date', async () => {
      const createDto = {
        title: 'Test Content',
        type: ContentType.TEXT,
        createdBy: 'user123',
        scheduledAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      };

      await expect(service.create(createDto)).rejects.toThrow(
        'Content scheduling error: Scheduled date must be in the future'
      );
    });
  });

  describe('findOne', () => {
    it('should return content when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockContent);

      const result = await service.findOne('123');

      expect(contentRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123' },
        relations: ['media', 'versions', 'children'],
      });
      expect(result).toEqual(mockContent);
    });

    it('should throw ContentNotFoundException when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('123')).rejects.toThrow(ContentNotFoundException);
    });
  });

  describe('update', () => {
    it('should update content and create version', async () => {
      const updateDto = {
        content: { text: 'Updated content' },
        updatedBy: 'user123',
        changelog: 'Updated text',
      };

      mockRepository.findOne.mockResolvedValue(mockContent);
      mockRepository.save.mockResolvedValue({ ...mockContent, ...updateDto });
      mockRepository.findOne.mockResolvedValueOnce(null); // For version check

      const result = await service.update('123', updateDto);

      expect(contentRepository.save).toHaveBeenCalled();
      expect(result.content).toEqual(updateDto.content);
    });
  });

  describe('publish', () => {
    it('should publish content', async () => {
      const publishedContent = {
        ...mockContent,
        status: ContentStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      };

      mockRepository.findOne.mockResolvedValue(mockContent);
      mockRepository.save.mockResolvedValue(publishedContent);

      const result = await service.publish('123', 'user123');

      expect(result.status).toBe(ContentStatus.PUBLISHED);
      expect(result.publishedAt).toBeDefined();
    });
  });

  describe('getContentTree', () => {
    it('should return hierarchical content structure', async () => {
      const rootContent = { ...mockContent, parentId: null };
      const childContent = { ...mockContent, id: '456', parentId: '123' };

      mockRepository.createQueryBuilder().getMany.mockResolvedValue([rootContent]);
      mockRepository.find.mockResolvedValue([childContent]);

      const result = await service.getContentTree();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('children');
    });
  });
});
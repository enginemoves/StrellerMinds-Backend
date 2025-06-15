import { Test, TestingModule } from '@nestjs/testing';
import { ContentController } from '../../src/content/content.controller';
import { ContentService } from '../../src/content/services/content.service';
import { MediaService } from '../../src/content/services/media.service';
import { ContentType, ContentStatus } from '../../src/content/enums/content.enum';

describe('ContentController', () => {
  let controller: ContentController;
  let contentService: ContentService;
  let mediaService: MediaService;

  const mockContentService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    publish: jest.fn(),
    archive: jest.fn(),
    getContentTree: jest.fn(),
    getScheduledContent: jest.fn(),
    processScheduledContent: jest.fn(),
    findWithVersions: jest.fn(),
    getVersion: jest.fn(),
    revertToVersion: jest.fn(),
  };

  const mockMediaService = {
    uploadMedia: jest.fn(),
    getMediaByContent: jest.fn(),
    deleteMedia: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        {
          provide: ContentService,
          useValue: mockContentService,
        },
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
      ],
    }).compile();

    controller = module.get<ContentController>(ContentController);
    contentService = module.get<ContentService>(ContentService);
    mediaService = module.get<MediaService>(MediaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create content', async () => {
      const createDto = {
        title: 'Test Content',
        type: ContentType.TEXT,
        createdBy: 'user123',
      };

      const expectedResult = {
        id: '123',
        ...createDto,
        status: ContentStatus.DRAFT,
      };

      mockContentService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(contentService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return paginated content list', async () => {
      const query = { page: 1, limit: 10 };
      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      mockContentService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(contentService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('uploadMedia', () => {
    it('should upload media file', async () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      const uploadDto = {
        contentId: '123',
        description: 'Test image',
        order: 0,
      };

      const expectedResult = {
        id: 'media123',
        filename: 'test.jpg',
        url: 'https://storage.example.com/media/test.jpg',
        type: 'image',
        size: 1024,
      };

      mockMediaService.uploadMedia.mockResolvedValue(expectedResult);

      const result = await controller.uploadMedia('123', file, uploadDto);

      expect(mediaService.uploadMedia).toHaveBeenCalledWith(file, {
        ...uploadDto,
        contentId: '123',
      });
      expect(result).toEqual(expectedResult);
    });
  });
});

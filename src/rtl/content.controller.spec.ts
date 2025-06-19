import { Test, TestingModule } from '@nestjs/testing';
import { ContentController } from '../../src/rtl/controllers/content.controller';
import { RTLService } from '../../src/rtl/services/rtl.service';

describe('ContentController', () => {
  let controller: ContentController;
  let rtlService: RTLService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [RTLService],
    }).compile();

    controller = module.get<ContentController>(ContentController);
    rtlService = module.get<RTLService>(RTLService);
  });

  describe('createContent', () => {
    it('should create content with RTL support', () => {
      const contentRequest = {
        title: 'مرحبا بالعالم',
        description: 'وصف المحتوى',
      };

      const result = controller.createContent(contentRequest, 'ar-SA');
      
      expect(result.language).toBeDefined();
      expect(result.isRTL).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { RTLService } from '../../src/rtl/services/rtl.service';

describe('RTLService', () => {
  let service: RTLService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RTLService],
    }).compile();

    service = module.get<RTLService>(RTLService);
  });

  describe('detectLanguage', () => {
    it('should detect Arabic text', () => {
      const arabicText = 'مرحبا بالعالم';
      expect(service.detectLanguage(arabicText)).toBe('ar');
    });

    it('should detect Hebrew text', () => {
      const hebrewText = 'שלום עולם';
      expect(service.detectLanguage(hebrewText)).toBe('he');
    });

    it('should default to English for unrecognized text', () => {
      const englishText = 'Hello World';
      expect(service.detectLanguage(englishText)).toBe('en');
    });

    it('should use Accept-Language header when provided', () => {
      expect(service.detectLanguage('', 'ar-SA,ar;q=0.9')).toBe('ar');
      expect(service.detectLanguage('', 'he-IL,he;q=0.8')).toBe('he');
    });
  });

  describe('isRTL', () => {
    it('should correctly identify RTL languages', () => {
      expect(service.isRTL('ar')).toBe(true);
      expect(service.isRTL('he')).toBe(true);
      expect(service.isRTL('fa')).toBe(true);
      expect(service.isRTL('en')).toBe(false);
    });
  });

  describe('addDirectionalMarkers', () => {
    it('should add RTL markers for Arabic text', () => {
      const text = 'مرحبا';
      const result = service.addDirectionalMarkers(text, 'ar');
      expect(result).toContain('\u200F'); // RLM
    });

    it('should add LTR markers for English text', () => {
      const text = 'Hello';
      const result = service.addDirectionalMarkers(text, 'en');
      expect(result).toContain('\u200E'); // LRM
    });
  });

  describe('prepareRTLContent', () => {
    it('should prepare RTL content with proper metadata', () => {
      const text = 'مرحبا بالعالم';
      const result = service.prepareRTLContent(text, 'ar');
      
      expect(result.direction).toBe('rtl');
      expect(result.language).toBe('ar');
      expect(result.hasDirectionalMarkers).toBe(true);
      expect(result.text).toBeDefined();
    });
  });

  describe('formatRTLResponse', () => {
    it('should format response with RTL metadata', () => {
      const data = { message: 'مرحبا' };
      const result = service.formatRTLResponse(data, 'ar');
      
      expect(result.data).toEqual(data);
      expect(result.meta.language).toBe('ar');
      expect(result.meta.direction).toBe('rtl');
      expect(result.meta.bidiSupport).toBe(true);
    });
  });

  describe('processMixedContent', () => {
    it('should handle mixed RTL/LTR content', () => {
      const content = [
        { text: 'Hello', language: 'en' },
        { text: 'مرحبا', language: 'ar' },
      ];
      
      const result = service.processMixedContent(content);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
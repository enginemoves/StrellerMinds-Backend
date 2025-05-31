import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from './i18n.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { I18nService as NestI18nService } from 'nestjs-i18n';

describe('I18nService', () => {
  let service: I18nService;
  let mockUserRepository: any;
  let mockI18nService: any;

  beforeEach(async () => {
    mockUserRepository = {
      update: jest.fn(),
      findOne: jest.fn(),
    };

    mockI18nService = {
      translate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        I18nService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: NestI18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<I18nService>(I18nService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('translate', () => {
    it('should translate a key', async () => {
      const key = 'common.welcome';
      const lang = 'en';
      mockI18nService.translate.mockResolvedValue('Welcome');

      const result = await service.translate(key, { lang });
      expect(result).toBe('Welcome');
      expect(mockI18nService.translate).toHaveBeenCalledWith(key, { lang });
    });
  });

  describe('setUserLanguage', () => {
    it('should update user language', async () => {
      const userId = '123';
      const language = 'es';
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.setUserLanguage(userId, language);
      expect(result).toEqual({ success: true, language });
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        preferredLanguage: language,
      });
    });
  });

  describe('getUserLanguage', () => {
    it('should return user language', async () => {
      const userId = '123';
      const user = { id: userId, preferredLanguage: 'es' };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.getUserLanguage(userId);
      expect(result).toBe('es');
    });

    it('should return default language if user not found', async () => {
      const userId = '123';
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserLanguage(userId);
      expect(result).toBe('en');
    });
  });

  describe('validateLanguage', () => {
    it('should validate supported languages', async () => {
      expect(await service.validateLanguage('en')).toBe(true);
      expect(await service.validateLanguage('es')).toBe(true);
      expect(await service.validateLanguage('ar')).toBe(true);
      expect(await service.validateLanguage('fr')).toBe(false);
    });
  });
});

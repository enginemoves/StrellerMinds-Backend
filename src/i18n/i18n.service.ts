import { Injectable } from '@nestjs/common';
import { I18nService as NestI18nService } from 'nestjs-i18n';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class I18nService {
  constructor(
    private readonly nestI18nService: NestI18nService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async translate(
    key: string,
    options: { lang: string; args?: any } = { lang: 'en' },
  ) {
    return this.nestI18nService.translate(key, {
      lang: options.lang,
      args: options.args,
    });
  }

  async setUserLanguage(userId: string, language: string) {
    await this.userRepository.update(userId, { preferredLanguage: language });
    return { success: true, language };
  }

  async getUserLanguage(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return user?.preferredLanguage || 'en';
  }

  async validateLanguage(language: string): Promise<boolean> {
    const supportedLanguages = ['en', 'es', 'ar'];
    return supportedLanguages.includes(language);
  }

  async getTranslations() {
    return {
      en: await this.nestI18nService.getTranslations(),
      es: await this.nestI18nService.getTranslations(),
      ar: await this.nestI18nService.getTranslations(),
    };
  }
}

import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { I18nService } from './i18n.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  @Get('languages')
  async getAvailableLanguages() {
    return {
      languages: [
        { code: 'en', name: 'English', isRTL: false },
        { code: 'es', name: 'Español', isRTL: false },
        { code: 'ar', name: 'العربية', isRTL: true },
      ],
    };
  }

  @Post('set-language')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async setUserLanguage(@Body() body: { language: string }) {
    // Here you would typically save the user's language preference to the database
    return {
      message: await this.i18nService.translate('common.success', {
        lang: body.language,
      }),
      language: body.language,
    };
  }

  @Get('translations')
  async getTranslations() {
    return this.i18nService.getTranslations();
  }
}

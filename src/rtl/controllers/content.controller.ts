import {
    Controller,
    Get,
    Post,
    Body,
    Headers,
    UseInterceptors,
    Query,
    Param,
  } from '@nestjs/common';
  import { RTLInterceptor } from '../interceptors/rtl.interceptor';
  import { RTLSupport } from '../decorators/rtl.decorator';
  import { RTLService } from '../services/rtl.service';
  import { RTL_LANGUAGES } from '../config/rtl.config';
  
  interface ContentRequest {
    title: string;
    description: string;
    language?: string;
  }
  
  @Controller('content')
  @UseInterceptors(RTLInterceptor)
  export class ContentController {
    constructor(private readonly rtlService: RTLService) {}
  
    @Get()
    @RTLSupport(true)
    getContent(
      @Headers('accept-language') acceptLanguage: string,
      @Query('lang') queryLang?: string,
    ) {
      const language = queryLang || this.rtlService.detectLanguage('', acceptLanguage);
      
      const sampleContent = {
        title: language === 'ar' ? 'مرحبا بالعالم' : 'Hello World',
        description: language === 'ar' 
          ? 'هذا مثال على المحتوى باللغة العربية مع دعم الاتجاه من اليمين إلى اليسار'
          : 'This is an example of content with RTL support',
        timestamp: new Date().toISOString(),
      };
  
      return sampleContent;
    }
  
    @Post()
    @RTLSupport(true)
    createContent(
      @Body() content: ContentRequest,
      @Headers('accept-language') acceptLanguage: string,
    ) {
      const language = content.language || 
                      this.rtlService.detectLanguage(content.title, acceptLanguage);
      
      const processedContent = {
        id: Math.random().toString(36).substr(2, 9),
        title: this.rtlService.addDirectionalMarkers(content.title, language),
        description: this.rtlService.addDirectionalMarkers(content.description, language),
        language,
        isRTL: this.rtlService.isRTL(language),
        createdAt: new Date().toISOString(),
      };
  
      return processedContent;
    }
  
    @Get('mixed')
    @RTLSupport(true)
    getMixedContent(@Headers('accept-language') acceptLanguage: string) {
      const mixedContent = [
        { text: 'Hello', language: 'en' },
        { text: 'مرحبا', language: 'ar' },
        { text: 'שלום', language: 'he' },
        { text: 'World', language: 'en' },
      ];
  
      const processedText = this.rtlService.processMixedContent(mixedContent);
  
      return {
        originalContent: mixedContent,
        processedText,
        supportedLanguages: Object.keys(RTL_LANGUAGES),
      };
    }
  
    @Get('language-info/:code')
    getLanguageInfo(@Param('code') code: string) {
      const config = this.rtlService.getLanguageConfig(code);
      
      return {
        language: config,
        isSupported: !!RTL_LANGUAGES[code.toLowerCase()],
        rtlCharacteristics: {
          readingDirection: config.direction,
          textAlignment: config.textAlign,
          requiresBidiOverride: config.bidiOverride,
        },
      };
    }
  }
  
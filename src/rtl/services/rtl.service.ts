import { Injectable, Logger } from '@nestjs/common';
import { RTLLanguageConfig, RTLContent, RTLResponse } from '../interfaces/rtl.interface';
import { RTL_LANGUAGES } from '../config/rtl.config';

@Injectable()
export class RTLService {
  private readonly logger = new Logger(RTLService.name);

  // Unicode directional marks
  private readonly RLM = '\u200F'; // Right-to-left mark
  private readonly LRM = '\u200E'; // Left-to-right mark
  private readonly RLE = '\u202B'; // Right-to-left embedding
  private readonly LRE = '\u202A'; // Left-to-right embedding
  private readonly PDF = '\u202C'; // Pop directional formatting
  private readonly RLO = '\u202E'; // Right-to-left override
  private readonly LRO = '\u202D'; // Left-to-right override

  /**
   * Detect language from text content or headers
   */
  detectLanguage(text: string, acceptLanguage?: string): string {
    try {
      // Check Accept-Language header first
      if (acceptLanguage) {
        const primaryLang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
        if (RTL_LANGUAGES[primaryLang]) {
          return primaryLang;
        }
      }

      // Simple RTL character detection
      const rtlPattern = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
      
      if (rtlPattern.test(text)) {
        // More specific detection
        if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
          return 'ar'; // Arabic script
        }
        if (/[\u0590-\u05FF]/.test(text)) {
          return 'he'; // Hebrew
        }
      }

      return 'en'; // Default to English
    } catch (error) {
      this.logger.error(`Language detection failed: ${error.message}`);
      return 'en';
    }
  }

  /**
   * Check if language is RTL
   */
  isRTL(languageCode: string): boolean {
    const config = RTL_LANGUAGES[languageCode.toLowerCase()];
    return config?.direction === 'rtl' || false;
  }

  /**
   * Get language configuration
   */
  getLanguageConfig(languageCode: string): RTLLanguageConfig {
    return RTL_LANGUAGES[languageCode.toLowerCase()] || RTL_LANGUAGES.en;
  }

  /**
   * Add directional markers to text
   */
  addDirectionalMarkers(text: string, languageCode: string): string {
    const config = this.getLanguageConfig(languageCode);
    
    if (config.direction === 'rtl') {
      // Add RLM at the beginning and end for RTL text
      return `${this.RLM}${text}${this.RLM}`;
    }
    
    // Add LRM for LTR text in mixed content
    return `${this.LRM}${text}${this.LRM}`;
  }

  /**
   * Wrap text with directional embedding
   */
  embedDirectionalText(text: string, languageCode: string): string {
    const config = this.getLanguageConfig(languageCode);
    
    if (config.direction === 'rtl') {
      return `${this.RLE}${text}${this.PDF}`;
    }
    
    return `${this.LRE}${text}${this.PDF}`;
  }

  /**
   * Apply directional override (use sparingly)
   */
  overrideTextDirection(text: string, languageCode: string): string {
    const config = this.getLanguageConfig(languageCode);
    
    if (config.bidiOverride && config.direction === 'rtl') {
      return `${this.RLO}${text}${this.PDF}`;
    }
    
    return text;
  }

  /**
   * Process mixed content with multiple languages
   */
  processMixedContent(content: Array<{ text: string; language: string }>): string {
    return content
      .map(item => this.embedDirectionalText(item.text, item.language))
      .join(' ');
  }

  /**
   * Sanitize and prepare RTL content
   */
  prepareRTLContent(text: string, languageCode: string): RTLContent {
    const config = this.getLanguageConfig(languageCode);
    const processedText = this.addDirectionalMarkers(text, languageCode);
    
    return {
      text: processedText,
      direction: config.direction,
      language: languageCode,
      hasDirectionalMarkers: true
    };
  }

  /**
   * Format response with RTL metadata
   */
  formatRTLResponse<T>(data: T, languageCode: string): RTLResponse<T> {
    const config = this.getLanguageConfig(languageCode);
    
    return {
      data,
      meta: {
        language: languageCode,
        direction: config.direction,
        textDirection: config.direction === 'rtl' ? 'rtl' : 'ltr',
        bidiSupport: true
      }
    };
  }
}

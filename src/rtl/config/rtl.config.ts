export const RTL_LANGUAGES: Record<string, RTLLanguageConfig> = {
    ar: { code: 'ar', name: 'Arabic', direction: 'rtl', bidiOverride: true, textAlign: 'right' },
    he: { code: 'he', name: 'Hebrew', direction: 'rtl', bidiOverride: true, textAlign: 'right' },
    fa: { code: 'fa', name: 'Persian', direction: 'rtl', bidiOverride: true, textAlign: 'right' },
    ur: { code: 'ur', name: 'Urdu', direction: 'rtl', bidiOverride: true, textAlign: 'right' },
    yi: { code: 'yi', name: 'Yiddish', direction: 'rtl', bidiOverride: true, textAlign: 'right' },
    ku: { code: 'ku', name: 'Kurdish', direction: 'rtl', bidiOverride: true, textAlign: 'right' },
    sd: { code: 'sd', name: 'Sindhi', direction: 'rtl', bidiOverride: true, textAlign: 'right' },
    // LTR languages for comparison
    en: { code: 'en', name: 'English', direction: 'ltr', bidiOverride: false, textAlign: 'left' },
    es: { code: 'es', name: 'Spanish', direction: 'ltr', bidiOverride: false, textAlign: 'left' },
    fr: { code: 'fr', name: 'French', direction: 'ltr', bidiOverride: false, textAlign: 'left' },
  };
  
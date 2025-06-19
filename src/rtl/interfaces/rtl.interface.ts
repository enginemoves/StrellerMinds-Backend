xport interface RTLLanguageConfig {
    code: string;
    name: string;
    direction: 'rtl' | 'ltr';
    bidiOverride?: boolean;
    textAlign: 'right' | 'left';
  }
  
  export interface RTLContent {
    text: string;
    direction: 'rtl' | 'ltr';
    language: string;
    hasDirectionalMarkers: boolean;
  }
  
  export interface RTLResponse<T = any> {
    data: T;
    meta: {
      language: string;
      direction: 'rtl' | 'ltr';
      textDirection: string;
      bidiSupport: boolean;
    };
  }
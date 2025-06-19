import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { map } from 'rxjs/operators';
  import { Reflector } from '@nestjs/core';
  import { RTLService } from '../services/rtl.service';
  import { RTL_SUPPORT_KEY } from '../decorators/rtl.decorator';
  
  @Injectable()
  export class RTLInterceptor implements NestInterceptor {
    constructor(
      private readonly rtlService: RTLService,
      private readonly reflector: Reflector,
    ) {}
  
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const rtlEnabled = this.reflector.get<boolean>(
        RTL_SUPPORT_KEY,
        context.getHandler(),
      );
  
      if (!rtlEnabled) {
        return next.handle();
      }
  
      const request = context.switchToHttp().getRequest();
      const acceptLanguage = request.headers['accept-language'];
      const languageCode = request.headers['content-language'] || 
                          this.rtlService.detectLanguage('', acceptLanguage);
  
      return next.handle().pipe(
        map(data => {
          if (typeof data === 'object' && data !== null) {
            return this.processObjectForRTL(data, languageCode);
          }
          return this.rtlService.formatRTLResponse(data, languageCode);
        }),
      );
    }
  
    private processObjectForRTL(obj: any, languageCode: string): any {
      if (typeof obj === 'string') {
        const rtlContent = this.rtlService.prepareRTLContent(obj, languageCode);
        return rtlContent.text;
      }
  
      if (Array.isArray(obj)) {
        return obj.map(item => this.processObjectForRTL(item, languageCode));
      }
  
      if (typeof obj === 'object' && obj !== null) {
        const processed = {};
        for (const [key, value] of Object.entries(obj)) {
          processed[key] = this.processObjectForRTL(value, languageCode);
        }
        return this.rtlService.formatRTLResponse(processed, languageCode);
      }
  
      return obj;
    }
  }
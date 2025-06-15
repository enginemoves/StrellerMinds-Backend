import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ContentTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        if (Array.isArray(data)) {
          return data.map(item => this.transformContent(item));
        }
        
        if (data && typeof data === 'object') {
          if (data.data && Array.isArray(data.data)) {
            // Handle paginated results
            return {
              ...data,
              data: data.data.map(item => this.transformContent(item))
            };
          }
          return this.transformContent(data);
        }
        
        return data;
      })
    );
  }

  private transformContent(content: any): any {
    if (!content || typeof content !== 'object') {
      return content;
    }

    // Remove sensitive fields
    const { createdBy, updatedBy, ...publicContent } = content;
    
    // Add computed fields
    return {
      ...publicContent,
      hasMedia: content.media && content.media.length > 0,
      hasVersions: content.versions && content.versions.length > 1,
      isPublished: content.status === 'published',
      isScheduled: content.status === 'scheduled' && content.scheduledAt > new Date(),
    };
  }
}
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ContentValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    
    const object = plainToClass(metatype, value);
    const errors = await validate(object);
    
    if (errors.length > 0) {
      const errorMessages = errors.map(error => 
        Object.values(error.constraints || {}).join(', ')
      ).join('; ');
      
      throw new BadRequestException(`Validation failed: ${errorMessages}`);
    }
    
    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}

// src/content/guards/content-access.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ContentService } from '../services/content.service';
import { ContentStatus } from '../enums/content.enum';

@Injectable()
export class ContentAccessGuard implements CanActivate {
  constructor(private readonly contentService: ContentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const contentId = request.params.id;
    const user = request.user; // Assuming user is attached to request

    if (!contentId || !user) {
      return false;
    }

    try {
      const content = await this.contentService.findOne(contentId);
      
      // Allow access to published content for all users
      if (content.status === ContentStatus.PUBLISHED) {
        return true;
      }

      // Allow creators and admins to access draft/archived content
      if (content.createdBy === user.id || user.role === 'admin') {
        return true;
      }

      throw new ForbiddenException('Access denied to this content');
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      return false;
    }
  }
}

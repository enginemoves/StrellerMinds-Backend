import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

export class ContentNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Content with ID ${id} not found`);
  }
}

export class ContentVersionNotFoundException extends NotFoundException {
  constructor(contentId: string, version: number) {
    super(`Version ${version} not found for content ${contentId}`);
  }
}

export class InvalidContentTypeException extends BadRequestException {
  constructor(type: string) {
    super(`Invalid content type: ${type}`);
  }
}

export class ContentSchedulingException extends BadRequestException {
  constructor(message: string) {
    super(`Content scheduling error: ${message}`);
  }
}

export class MediaUploadException extends BadRequestException {
  constructor(message: string) {
    super(`Media upload error: ${message}`);
  }
}
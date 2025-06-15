import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentMedia } from '../entities/content-media.entity';
import { UploadMediaDto } from '../dto/upload-media.dto';
import { MediaUploadException } from '../exceptions/content.exceptions';
import { MediaType } from '../enums/content.enum';
import { MediaUploadResult } from '../interfaces/content.interface';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectRepository(ContentMedia)
    private readonly mediaRepository: Repository<ContentMedia>
  ) {}

  async uploadMedia(
    file: Express.Multer.File,
    uploadDto: UploadMediaDto
  ): Promise<MediaUploadResult> {
    try {
      this.logger.log(`Uploading media: ${file.originalname}`);

      // Validate file
      this.validateFile(file);

      // Generate unique filename
      const filename = this.generateFilename(file);
      
      // Determine media type
      const mediaType = this.getMediaType(file.mimetype);
      
      // In production, upload to cloud storage (AWS S3, Google Cloud, etc.)
      const url = await this.uploadToStorage(file, filename);
      
      // Generate thumbnail for images/videos
      const thumbnailUrl = await this.generateThumbnail(file, mediaType);

      // Save media record
      const media = this.mediaRepository.create({
        contentId: uploadDto.contentId,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        type: mediaType,
        size: file.size,
        url,
        thumbnailUrl,
        order: uploadDto.order || 0,
        metadata: {
          description: uploadDto.description
        }
      });

      const savedMedia = await this.mediaRepository.save(media);

      return {
        id: savedMedia.id,
        filename: savedMedia.filename,
        url: savedMedia.url,
        type: savedMedia.type,
        size: savedMedia.size
      };
    } catch (error) {
      this.logger.error(`Media upload failed: ${error.message}`);
      throw new MediaUploadException(error.message);
    }
  }

  async getMediaByContent(contentId: string): Promise<ContentMedia[]> {
    return this.mediaRepository.find({
      where: { contentId },
      order: { order: 'ASC' }
    });
  }

  async deleteMedia(id: string): Promise<void> {
    const media = await this.mediaRepository.findOne({ where: { id } });
    if (!media) return;

    // Delete from storage
    await this.deleteFromStorage(media.filename);
    
    // Delete record
    await this.mediaRepository.remove(media);
  }

  private validateFile(file: Express.Multer.File): void {
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new MediaUploadException('File size exceeds maximum limit');
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mp3', 'audio/wav', 'audio/ogg',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new MediaUploadException('File type not supported');
    }
  }

  private generateFilename(file: Express.Multer.File): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = file.originalname.split('.').pop();
    return `${timestamp}-${random}.${extension}`;
  }

  private getMediaType(mimetype: string): MediaType {
    if (mimetype.startsWith('image/')) return MediaType.IMAGE;
    if (mimetype.startsWith('video/')) return MediaType.VIDEO;
    if (mimetype.startsWith('audio/')) return MediaType.AUDIO;
    return MediaType.DOCUMENT;
  }

  private async uploadToStorage(file: Express.Multer.File, filename: string): Promise<string> {
    // Mock implementation - in production, use AWS S3, Google Cloud Storage, etc.
    return `https://storage.example.com/media/${filename}`;
  }

  private async generateThumbnail(file: Express.Multer.File, type: MediaType): Promise<string | null> {
    // Mock implementation - in production, generate actual thumbnails
    if (type === MediaType.IMAGE || type === MediaType.VIDEO) {
      return `https://storage.example.com/thumbnails/thumb_${this.generateFilename(file)}`;
    }
    return null;
  }

  private async deleteFromStorage(filename: string): Promise<void> {
    // Mock implementation - in production, delete from actual storage
    this.logger.log(`Deleted file from storage: ${filename}`);
  }
}

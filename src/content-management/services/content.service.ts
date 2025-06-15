import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, IsNull } from 'typeorm';
import { Content } from '../entities/content.entity';
import { ContentVersion } from '../entities/content-version.entity';
import { ContentMedia } from '../entities/content-media.entity';
import { CreateContentDto } from '../dto/create-content.dto';
import { UpdateContentDto } from '../dto/update-content.dto';
import { ContentQueryDto } from '../dto/content-query.dto';
import { ContentNotFoundException, ContentSchedulingException } from '../exceptions/content.exceptions';
import { ContentType, ContentStatus } from '../enums/content.enum';
import { ContentTree, ContentWithVersions } from '../interfaces/content.interface';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(ContentVersion)
    private readonly versionRepository: Repository<ContentVersion>,
    @InjectRepository(ContentMedia)
    private readonly mediaRepository: Repository<ContentMedia>
  ) {}

  async create(createContentDto: CreateContentDto): Promise<Content> {
    this.logger.log(`Creating content: ${createContentDto.title}`);

    // Validate scheduling
    if (createContentDto.scheduledAt) {
      const scheduledDate = new Date(createContentDto.scheduledAt);
      if (scheduledDate <= new Date()) {
        throw new ContentSchedulingException('Scheduled date must be in the future');
      }
    }

    const content = this.contentRepository.create({
      ...createContentDto,
      scheduledAt: createContentDto.scheduledAt ? new Date(createContentDto.scheduledAt) : null
    });

    const savedContent = await this.contentRepository.save(content);

    // Create initial version
    await this.createVersion(savedContent.id, savedContent.content, savedContent.createdBy, 'Initial version');

    return savedContent;
  }

  async findAll(query: ContentQueryDto): Promise<{ data: Content[]; total: number; page: number; limit: number }> {
    const { page, limit, type, status, courseId, parentId, search, sortBy, sortOrder } = query;
    
    const queryBuilder = this.contentRepository.createQueryBuilder('content')
      .leftJoinAndSelect('content.media', 'media')
      .leftJoinAndSelect('content.versions', 'versions');

    // Apply filters
    const where: FindOptionsWhere<Content> = {};
    
    if (type) where.type = type;
    if (status) where.status = status;
    if (courseId) where.courseId = courseId;
    if (parentId) {
      where.parentId = parentId;
    } else {
      where.parentId = IsNull();
    }

    Object.keys(where).forEach(key => {
      queryBuilder.andWhere(`content.${key} = :${key}`, { [key]: where[key] });
    });

    if (search) {
      queryBuilder.andWhere(
        '(content.title ILIKE :search OR content.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`content.${sortBy}`, sortOrder);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit
    };
  }

  async findOne(id: string): Promise<Content> {
    const content = await this.contentRepository.findOne({
      where: { id },
      relations: ['media', 'versions', 'children']
    });

    if (!content) {
      throw new ContentNotFoundException(id);
    }

    return content;
  }

  async findWithVersions(id: string): Promise<ContentWithVersions> {
    const content = await this.findOne(id);
    const versions = await this.versionRepository.find({
      where: { contentId: id },
      order: { version: 'DESC' }
    });

    return {
      id: content.id,
      title: content.title,
      type: content.type,
      status: content.status,
      content: content.content,
      currentVersion: versions[0]?.version || 1,
      versions: versions.map(v => ({
        version: v.version,
        createdAt: v.createdAt,
        createdBy: v.createdBy,
        changelog: v.changelog
      }))
    };
  }

  async update(id: string, updateContentDto: UpdateContentDto): Promise<Content> {
    const content = await this.findOne(id);
    
    // Validate scheduling
    if (updateContentDto.scheduledAt) {
      const scheduledDate = new Date(updateContentDto.scheduledAt);
      if (scheduledDate <= new Date()) {
        throw new ContentSchedulingException('Scheduled date must be in the future');
      }
    }

    // Create new version if content changed
    if (updateContentDto.content && JSON.stringify(updateContentDto.content) !== JSON.stringify(content.content)) {
      await this.createVersion(
        id, 
        updateContentDto.content, 
        updateContentDto.updatedBy || 'system',
        updateContentDto.changelog || 'Content updated'
      );
    }

    Object.assign(content, {
      ...updateContentDto,
      scheduledAt: updateContentDto.scheduledAt ? new Date(updateContentDto.scheduledAt) : content.scheduledAt
    });

    return this.contentRepository.save(content);
  }

  async publish(id: string, publishedBy: string): Promise<Content> {
    const content = await this.findOne(id);
    
    content.status = ContentStatus.PUBLISHED;
    content.publishedAt = new Date();
    content.updatedBy = publishedBy;

    return this.contentRepository.save(content);
  }

  async archive(id: string, archivedBy: string): Promise<Content> {
    const content = await this.findOne(id);
    
    content.status = ContentStatus.ARCHIVED;
    content.updatedBy = archivedBy;

    return this.contentRepository.save(content);
  }

  async remove(id: string): Promise<void> {
    const content = await this.findOne(id);
    
    // Remove all versions and media
    await this.versionRepository.delete({ contentId: id });
    await this.mediaRepository.delete({ contentId: id });
    
    await this.contentRepository.remove(content);
  }

  async getContentTree(courseId?: string): Promise<ContentTree[]> {
    const queryBuilder = this.contentRepository.createQueryBuilder('content')
      .where('content.parentId IS NULL')
      .orderBy('content.order', 'ASC');

    if (courseId) {
      queryBuilder.andWhere('content.courseId = :courseId', { courseId });
    }

    const rootContents = await queryBuilder.getMany();
    
    return Promise.all(rootContents.map(content => this.buildContentTree(content)));
  }

  private async buildContentTree(content: Content): Promise<ContentTree> {
    const children = await this.contentRepository.find({
      where: { parentId: content.id },
      order: { order: 'ASC' }
    });

    return {
      id: content.id,
      title: content.title,
      type: content.type,
      status: content.status,
      order: content.order,
      children: await Promise.all(children.map(child => this.buildContentTree(child)))
    };
  }

  private async createVersion(contentId: string, content: any, createdBy: string, changelog?: string): Promise<ContentVersion> {
    const lastVersion = await this.versionRepository.findOne({
      where: { contentId },
      order: { version: 'DESC' }
    });

    const version = this.versionRepository.create({
      contentId,
      version: (lastVersion?.version || 0) + 1,
      content,
      createdBy,
      changelog
    });

    return this.versionRepository.save(version);
  }

  async getVersion(contentId: string, version: number): Promise<ContentVersion> {
    const contentVersion = await this.versionRepository.findOne({
      where: { contentId, version }
    });

    if (!contentVersion) {
      throw new ContentVersionNotFoundException(contentId, version);
    }

    return contentVersion;
  }

  async revertToVersion(contentId: string, version: number, revertedBy: string): Promise<Content> {
    const contentVersion = await this.getVersion(contentId, version);
    const content = await this.findOne(contentId);

    // Create new version with reverted content
    await this.createVersion(
      contentId,
      contentVersion.content,
      revertedBy,
      `Reverted to version ${version}`
    );

    content.content = contentVersion.content;
    content.updatedBy = revertedBy;

    return this.contentRepository.save(content);
  }

  async getScheduledContent(): Promise<Content[]> {
    return this.contentRepository.find({
      where: {
        status: ContentStatus.SCHEDULED,
        scheduledAt: Like(`${new Date().toISOString().split('T')[0]}%`)
      }
    });
  }

  async processScheduledContent(): Promise<void> {
    const now = new Date();
    const scheduledContent = await this.contentRepository.find({
      where: {
        status: ContentStatus.SCHEDULED
      }
    });

    for (const content of scheduledContent) {
      if (content.scheduledAt && content.scheduledAt <= now) {
        content.status = ContentStatus.PUBLISHED;
        content.publishedAt = now;
        await this.contentRepository.save(content);
        
        this.logger.log(`Auto-published scheduled content: ${content.title}`);
      }
    }
  }
}

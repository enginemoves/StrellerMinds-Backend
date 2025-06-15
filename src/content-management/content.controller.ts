import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseInterceptors,
    UploadedFile,
    HttpCode,
    HttpStatus
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { ContentService } from './services/content.service';
  import { MediaService } from './services/media.service';
  import { CreateContentDto } from './dto/create-content.dto';
  import { UpdateContentDto } from './dto/update-content.dto';
  import { ContentQueryDto } from './dto/content-query.dto';
  import { UploadMediaDto } from './dto/upload-media.dto';
  
  @Controller('content')
  export class ContentController {
    constructor(
      private readonly contentService: ContentService,
      private readonly mediaService: MediaService
    ) {}
  
    @Post()
    async create(@Body() createContentDto: CreateContentDto) {
      return this.contentService.create(createContentDto);
    }
  
    @Get()
    async findAll(@Query() query: ContentQueryDto) {
      return this.contentService.findAll(query);
    }
  
    @Get('tree')
    async getContentTree(@Query('courseId') courseId?: string) {
      return this.contentService.getContentTree(courseId);
    }
  
    @Get('scheduled')
    async getScheduledContent() {
      return this.contentService.getScheduledContent();
    }
  
    @Post('process-scheduled')
    @HttpCode(HttpStatus.NO_CONTENT)
    async processScheduledContent() {
      return this.contentService.processScheduledContent();
    }
  
    @Get(':id')
    async findOne(@Param('id') id: string) {
      return this.contentService.findOne(id);
    }
  
    @Get(':id/versions')
    async getVersions(@Param('id') id: string) {
      return this.contentService.findWithVersions(id);
    }
  
    @Get(':id/versions/:version')
    async getVersion(
      @Param('id') id: string,
      @Param('version') version: number
    ) {
      return this.contentService.getVersion(id, version);
    }
  
    @Post(':id/revert/:version')
    async revertToVersion(
      @Param('id') id: string,
      @Param('version') version: number,
      @Body('revertedBy') revertedBy: string
    ) {
      return this.contentService.revertToVersion(id, version, revertedBy);
    }
  
    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateContentDto: UpdateContentDto) {
      return this.contentService.update(id, updateContentDto);
    }
  
    @Post(':id/publish')
    async publish(@Param('id') id: string, @Body('publishedBy') publishedBy: string) {
      return this.contentService.publish(id, publishedBy);
    }
  
    @Post(':id/archive')
    async archive(@Param('id') id: string, @Body('archivedBy') archivedBy: string) {
      return this.contentService.archive(id, archivedBy);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string) {
      return this.contentService.remove(id);
    }
  
    @Post(':id/media')
    @UseInterceptors(FileInterceptor('file'))
    async uploadMedia(
      @Param('id') id: string,
      @UploadedFile() file: Express.Multer.File,
      @Body() uploadDto: UploadMediaDto
    ) {
      uploadDto.contentId = id;
      return this.mediaService.uploadMedia(file, uploadDto);
    }
  
    @Get(':id/media')
    async getMedia(@Param('id') id: string) {
      return this.mediaService.getMediaByContent(id);
    }
  
    @Delete('media/:mediaId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteMedia(@Param('mediaId') mediaId: string) {
      return this.mediaService.deleteMedia(mediaId);
    }
  }
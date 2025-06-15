import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { ContentController } from './content.controller';
import { ContentService } from './services/content.service';
import { MediaService } from './services/media.service';
import { ContentSchedulerService } from './services/content-scheduler.service';
import { Content } from './entities/content.entity';
import { ContentVersion } from './entities/content-version.entity';
import { ContentMedia } from './entities/content-media.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Content, ContentVersion, ContentMedia]),
    MulterModule.register({
      dest: './uploads',
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [ContentController],
  providers: [ContentService, MediaService, ContentSchedulerService],
  exports: [ContentService, MediaService],
})
export class ContentModule {}
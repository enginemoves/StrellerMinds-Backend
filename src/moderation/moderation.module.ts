import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationLog } from './entities/forum-moderation-logs.entity';
import { ApiTags } from '@nestjs/swagger';

/**
 * Moderation module for managing forum moderation actions and logs.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ModerationLog])],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}

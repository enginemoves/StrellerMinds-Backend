/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ModerationLog } from './entities/forum-moderation-logs.entity';
import { Repository } from 'typeorm';
import { Thread } from 'src/thread/thread.entity';
import { Reply } from 'src/reply/reply.entity';

// Moderation Service
@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(ModerationLog)
    private moderationLogRepository: Repository<ModerationLog>,
    @InjectRepository(Thread) private threadRepo: Repository<Thread>,
    @InjectRepository(Reply) private replyRepo: Repository<Reply>,
  ) {}

  async lockThread(threadId: number) {
    const thread = await this.threadRepo.findOneBy({ id: threadId });
    thread.isOpen = false;
    return this.threadRepo.save(thread);
  }

  async reportReply(replyId: number) {
    const reply = await this.replyRepo.findOneBy({ id: replyId });
    reply.isReported = true;
    return this.replyRepo.save(reply);
  }

  async deleteReply(replyId: number) {
    return this.replyRepo.softDelete(replyId);
  }

  async logModerationAction(
    action: string,
    entityType: string,
    entityId: string,
    moderatorId: string,
  ): Promise<ModerationLog> {
    const log = this.moderationLogRepository.create({
      action,
      entityType,
      entityId,
      moderator: { id: moderatorId },
    });
    return this.moderationLogRepository.save(log);
  }
}

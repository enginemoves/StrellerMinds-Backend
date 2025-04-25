import { Module } from '@nestjs/common';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './provider/submission.service';

@Module({
  controllers: [SubmissionController],
  providers: [SubmissionService]
})
export class SubmissionModule {}

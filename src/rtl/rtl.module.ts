import { Module } from '@nestjs/common';
import { RTLService } from './services/rtl.service';
import { ContentController } from './controllers/content.controller';

@Module({
  providers: [RTLService],
  controllers: [ContentController],
  exports: [RTLService],
})
export class RTLModule {}
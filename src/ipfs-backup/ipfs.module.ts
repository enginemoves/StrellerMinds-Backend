import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { CidRecord } from './entities/cid-record.entity';
import { IpfsService } from './ipfs.service';
import { IpfsBackupService } from './ipfs-backup.service';
import { IpfsBackupController } from './ipfs-backup.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupCronService } from './backup-cron.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, CidRecord]), ScheduleModule.forRoot()],
  providers: [IpfsService, IpfsBackupService, BackupCronService],
  controllers: [IpfsBackupController],
  exports: [IpfsBackupService],
})
export class IpfsBackupModule {}

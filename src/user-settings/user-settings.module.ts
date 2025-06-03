import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSetting } from './entities/user-setting.entity';
import { UserSettingsService } from './user-settings.service';
import { UserSettingsController } from './user-settings.controller';
import { UserSetting } from './entities/user-setting.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([UserSetting])],
  controllers: [UserSettingsController],
  providers: [UserSettingsService],
  exports: [UserSettingsService],
})
export class UserSettingsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSetting } from './entities/user-setting.entity';
import { UserSettingsService } from './user-settings.service';
import { UserSettingsController } from './user-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserSetting])],
  controllers: [UserSettingsController],
  providers: [UserSettingsService],
})
export class UserSettingsModule {}

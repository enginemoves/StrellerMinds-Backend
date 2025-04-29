import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { UserProfilesService } from "./user-profiles.service"
import { UserProfilesController } from "./user-profiles.controller"
import { UserProfile } from "./entities/user-profile.entity"
import { User } from "../users/entities/user.entity"

@Module({
  imports: [TypeOrmModule.forFeature([UserProfile, User])],
  controllers: [UserProfilesController],
  providers: [UserProfilesService],
  exports: [UserProfilesService],
})
export class UserProfilesModule {}

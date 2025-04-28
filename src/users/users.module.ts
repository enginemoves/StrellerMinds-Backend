import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UnifiedUsersController } from './users.controller';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { WalletInfo } from './entities/wallet-info.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, WalletInfo])],
  controllers: [UnifiedUsersController],
  providers: [UsersService, CloudinaryService],
  exports: [UsersService],
})
export class UsersModule {}




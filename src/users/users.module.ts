import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller'; // Corrected import
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { WalletInfo } from './entities/wallet-info.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, WalletInfo])],
  controllers: [UsersController], // Corrected controller
  providers: [UsersService, CloudinaryService],
  exports: [UsersService],
})
export class UsersModule {}
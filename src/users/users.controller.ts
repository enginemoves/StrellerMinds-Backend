import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ParseUUIDPipe,
  ConflictException,
  InternalServerErrorException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';

import { CreateUsersDto } from './dtos/create.users.dto';
import { updateUsersDto } from './dtos/update.users.dto';
import { UsersService } from './services/users.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {} // Or UserService


  @UseInterceptors(FileInterceptor('file'))
  @Post('create')
  async createUser(
    @UploadedFile() file: Express.Multer.File,
    @Body() createUsersDto: CreateUsersDto,
  ) {
    try {
      // Delegate the user creation and image upload to the service
      const user = await this.userService.create(createUsersDto, file);
      return user;
    } catch (error) {
      throw new InternalServerErrorException('Error creating user');
    }
  }


  @Get()
  public async findAll() {
    return await this.userService.findAll();
  }

  @Get(':id')
  public async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.findOne(id);
  }

  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: updateUsersDto,
  ) {
    return await this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  public async delete(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.delete(id);
  }
}

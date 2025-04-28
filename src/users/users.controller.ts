import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ParseUUIDPipe,
  InternalServerErrorException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { CreateUsersDto } from './dtos/create.users.dto';
import { updateUsersDto } from './dtos/update.users.dto';
import { UsersService } from './users.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/role/roles.decorator';
import { Role } from 'src/role/roles.enum';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @UseInterceptors(FileInterceptor('file'))
  @Post('create')
  async createUser(
    @UploadedFile() file: Express.Multer.File,
    @Body() createUsersDto: CreateUsersDto,
  ) {
    try {
      const user = await this.userService.create(createUsersDto, file);
      return user;
    } catch (error) {
      throw new InternalServerErrorException('Error creating user');
    }
  }

  @Get('all')
  @Roles(Role.ADMIN) // Corrected to Role.ADMIN
  async findAll() {
    return await this.userService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: updateUsersDto,
  ) {
    return await this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.delete(id);
  }
}

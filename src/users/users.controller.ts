import {
  Controller,
  Get,
  Post,
  Put, // ✅ Add this
  Body,
  Param,
  Delete,
  Patch,
  ParseUUIDPipe,
  InternalServerErrorException,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

import { CreateUsersDto } from './dtos/create.users.dto';
import { updateUsersDto } from './dtos/update.users.dto';
import { UsersService } from './services/users.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { RateLimitGuard } from 'src/common/guards/rate-limiter.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(RateLimitGuard)
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

  @Patch(':id')
  public async patchUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: updateUsersDto,
  ) {
    return await this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  public async delete(@Param('id', ParseUUIDPipe) id: string) {
    return await this.userService.delete(id);
  }

  @Post(':id/request-account-deletion')
  async requestAccountDeletion(@Param('id') id: string) {
    await this.userService.requestAccountDeletion(id);
    return { message: 'Account deletion confirmation email sent' };
  }

  @Get()
  async findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @CustomCacheKey((context) => {
    const request = context.switchToHttp().getRequest();
    return `user:${request.params.id}:profile`;
  })
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: updateUsersDto) {
    return this.userService.update(id, updateUserDto);
  }
}

// ✅ Custom param decorator
export const Query = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.query;
  },
);

// ✅ Dummy cache decorator placeholder (optional: move to separate file)
export function CustomCacheKey(
  keyGenerator: (context: ExecutionContext) => string
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    // Cache logic placeholder
  };
}

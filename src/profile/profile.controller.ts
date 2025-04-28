import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Delete,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Controller('profile')
export class ProfileController {
  constructor(
    private readonly cloudinaryService: CloudinaryService, //deps injection of claudinary service
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfileImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }
    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      throw new BadRequestException('File too large');
    }

    const result = await this.cloudinaryService.uploadImage(file);
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  @Delete('delete')
  async deleteProfileImage(@Body('publicId') publicId: string) {
    if (!publicId) {
      throw new BadRequestException('Public ID is required');
    }

    await this.cloudinaryService.deleteImage(publicId);
    return { message: 'Image deleted successfully' };
  }
}

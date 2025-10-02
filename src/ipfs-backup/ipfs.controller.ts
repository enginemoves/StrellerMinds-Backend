import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  Get,
  Param,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IpfsBackupService } from './ipfs-backup.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { Repository } from 'typeorm';
import { UploadAssetDto } from './dto/upload-asset.dto';
import { Response } from 'express';

@Controller('ipfs-backup')
export class IpfsBackupController {
  constructor(
    private readonly backupService: IpfsBackupService,
    @InjectRepository(Asset) private assetRepo: Repository<Asset>,
  ) {}

  // upload and backup an arbitrary file and create an Asset record
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadAssetDto) {
    if (!file) throw new BadRequestException("File is required under 'file' field");
    if (!dto.courseId) throw new BadRequestException('courseId is required');

    const asset = this.assetRepo.create({
      courseId: dto.courseId,
      originalPath: dto.originalPath ?? null,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      backedUp: false,
    });
    await this.assetRepo.save(asset);

    // file.buffer exists only if Multer memoryStorage is used. We will accept either.
    if (file.buffer) {
      const cidRecord = await this.backupService.uploadBufferForAsset(
        asset,
        file.buffer,
        file.originalname,
      );
      return { asset, cidRecord };
    } else if (file.path) {
      // diskStorage
      const fs = require('fs');
      const stream = fs.createReadStream(file.path);
      const cidRecord = await this.backupService.uploadStreamForAsset(
        asset,
        stream,
        file.originalname,
      );
      return { asset, cidRecord };
    } else {
      throw new BadRequestException('Unsupported multer config. Use memoryStorage or diskStorage');
    }
  }

  // Get CID record info
  @Get('cid/:cid')
  async getByCid(@Param('cid') cid: string) {
    const rec = await this.backupService.getCidRecordByCid(cid);
    if (!rec) throw new BadRequestException('CID not found');
    return rec;
  }

  // Download / rehydrate a file by cid
  @Get('download/:cid')
  async download(@Param('cid') cid: string, @Res() res: Response) {
    const rec = await this.backupService.getCidRecordByCid(cid);
    if (!rec) throw new BadRequestException('CID not found');
    const data = await this.backupService.rehydrateFromCid(cid);
    res.setHeader('Content-Disposition', `attachment; filename="${rec.filename ?? 'file'}"`);
    if (data.mimeType) res.setHeader('Content-Type', data.mimeType);
    res.send(data.buffer);
  }
}

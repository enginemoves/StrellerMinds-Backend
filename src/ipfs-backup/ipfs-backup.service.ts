import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './entities/asset.entity';
import { CidRecord } from './entities/cid-record.entity';
import { IpfsService } from './ipfs.service';
import * as crypto from 'crypto';
import { Readable } from 'stream';

@Injectable()
export class IpfsBackupService {
  private readonly logger = new Logger(IpfsBackupService.name);

  constructor(
    @InjectRepository(Asset) private assetRepo: Repository<Asset>,
    @InjectRepository(CidRecord) private cidRepo: Repository<CidRecord>,
    private readonly ipfsService: IpfsService,
  ) {}

  async computeSha256(stream: NodeJS.ReadableStream): Promise<string> {
    return await new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      stream.on('data', (d) => hash.update(d));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  // helper to create a readable copy of a buffer or stream
  bufferToStream(buffer: Buffer): Readable {
    const s = new Readable();
    s.push(buffer);
    s.push(null);
    return s;
  }

  async uploadBufferForAsset(asset: Asset, buffer: Buffer, filename?: string) {
    // compute sha256 for dedupe
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    // dedupe: if asset exists with same sha256 and a cid exists, link to it
    const existingCid = await this.cidRepo.findOne({
      where: { meta: { sha256 }, status: 'pinned' } as any,
    });
    if (existingCid) {
      asset.backedUp = true;
      await this.assetRepo.save(asset);
      return existingCid;
    }

    const stream = this.bufferToStream(buffer);
    const ipfsResult = await this.ipfsService.addStream(stream, filename);
    const cidRecord = this.cidRepo.create({
      cid: ipfsResult.cid,
      assetId: asset.id,
      filename: filename ?? asset.filename,
      mimeType: asset.mimeType,
      size: ipfsResult.size || asset.size,
      status: 'pinned',
      attempts: 1,
      meta: { sha256 },
    });
    await this.cidRepo.save(cidRecord);

    asset.backedUp = true;
    asset.sha256 = sha256;
    await this.assetRepo.save(asset);

    return cidRecord;
  }

  // Upload from local stream (used by controller)
  async uploadStreamForAsset(asset: Asset, stream: NodeJS.ReadableStream, filename?: string) {
    // we need to compute hash while streaming. easiest approach: buffer everything (works for moderate sizes).
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    return this.uploadBufferForAsset(asset, buffer, filename);
  }

  async getCidRecordById(id: string) {
    return this.cidRepo.findOne({ where: { id } });
  }

  async getCidRecordByCid(cid: string) {
    return this.cidRepo.findOne({ where: { cid } });
  }

  async rehydrateFromCid(cid: string) {
    const record = await this.getCidRecordByCid(cid);
    if (!record) throw new NotFoundException('CID record not found');
    const buf = await this.ipfsService.cat(cid);
    return {
      buffer: buf,
      filename: record.filename,
      mimeType: record.mimeType,
    };
  }

  // Attempt to backup assets that are not backed up yet (could be scheduled)
  async processPendingBackups(limit = 20) {
    const pending = await this.assetRepo.find({ where: { backedUp: false }, take: limit });
    for (const asset of pending) {
      try {
        // get source file stream (this method should be adapted to your storage)
        const stream = await this.getFileStream(asset.originalPath);
        await this.uploadStreamForAsset(asset, stream, asset.filename);
      } catch (err) {
        this.logger.error('Failed to backup asset ' + asset.id, err);
        asset.lastBackupError = err.message?.substring(0, 1000);
        await this.assetRepo.save(asset);
      }
    }
    return pending.length;
  }

  // Placeholder: adapt for S3 / local disk / etc.
  async getFileStream(originalPath: string): Promise<NodeJS.ReadableStream> {
    // Example for local disk:
    const fs = require('fs');
    if (!originalPath) throw new Error('No originalPath provided');
    return fs.createReadStream(originalPath);
  }
}

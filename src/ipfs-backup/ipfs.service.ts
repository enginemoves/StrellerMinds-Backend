import { Injectable, Logger } from '@nestjs/common';
import { create } from 'ipfs-http-client';
import IPFS_DEFAULT_OPTIONS from './ipfs.config';

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private client: any;
  private options = IPFS_DEFAULT_OPTIONS;

  constructor() {
    const { apiUrl, projectId, projectSecret } = this.options;

    if (projectId && projectSecret) {
      const auth = 'Basic ' + Buffer.from(`${projectId}:${projectSecret}`).toString('base64');
      this.client = create({ url: apiUrl, headers: { authorization: auth } });
    } else {
      this.client = create({ url: apiUrl });
    }
  }

  async addStream(stream: NodeJS.ReadableStream, filename?: string, pin = this.options.pin) {
    // ipfs-http-client add supports options
    try {
      const result = await this.client.add(
        { content: stream, path: filename },
        { wrapWithDirectory: false, pin },
      );
      // result is { cid, path, size } OR an async iterable; using .add returns a single object
      return {
        cid: result.cid.toString(),
        size: Number(result.size ?? 0),
        path: result.path,
      };
    } catch (err) {
      this.logger.error('IPFS add failed', err);
      throw err;
    }
  }

  async pinCid(cid: string) {
    try {
      await this.client.pin.add(cid);
      return true;
    } catch (err) {
      this.logger.error('Pin failed for ' + cid, err);
      throw err;
    }
  }

  async cat(cid: string) {
    // return async iterable of Uint8Array — we convert to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of this.client.cat(cid)) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}

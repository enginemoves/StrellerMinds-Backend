export interface UploadedFileLike {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
}

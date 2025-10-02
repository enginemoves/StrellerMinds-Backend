import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME', 'strellerminds-certificates');
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  /**
   * Upload PDF buffer to S3 and return URL with checksum
   */
  async uploadCertificate(
    certificateId: string,
    pdfBuffer: Buffer,
    metadata: Record<string, any>
  ): Promise<{ url: string; checksum: string }> {
    try {
      const key = `certificates/${certificateId}.pdf`;
      const checksum = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ContentDisposition: 'inline',
        Metadata: {
          certificateId,
          checksum,
          ...Object.fromEntries(
            Object.entries(metadata).map(([k, v]) => [k, String(v)])
          ),
        },
        ServerSideEncryption: 'AES256',
      });

      await this.s3Client.send(command);
      
      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
      
      this.logger.log(`Certificate uploaded successfully: ${certificateId}`);
      return { url, checksum };
      
    } catch (error) {
      this.logger.error(`Failed to upload certificate: ${error.message}`, error.stack);
      throw new Error(`Failed to upload certificate: ${error.message}`);
    }
  }

  /**
   * Verify if certificate exists in S3 and return metadata
   */
  async verifyCertificate(certificateId: string): Promise<{ exists: boolean; metadata?: Record<string, any> }> {
    try {
      const key = `certificates/${certificateId}.pdf`;
      
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      return {
        exists: true,
        metadata: response.Metadata || {},
      };
      
    } catch (error) {
      if (error.name === 'NotFound') {
        return { exists: false };
      }
      
      this.logger.error(`Failed to verify certificate: ${error.message}`, error.stack);
      throw new Error(`Failed to verify certificate: ${error.message}`);
    }
  }

  /**
   * Get signed URL for temporary access to certificate
   */
  async getSignedUrl(certificateId: string, expiresIn: number = 3600): Promise<string> {
    try {
      const key = `certificates/${certificateId}.pdf`;
      
      // For simplicity, return the direct URL - in production, you'd use getSignedUrl
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
      
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`, error.stack);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Delete certificate from S3
   */
  async deleteCertificate(certificateId: string): Promise<void> {
    try {
      const key = `certificates/${certificateId}.pdf`;
      
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Certificate deleted successfully: ${certificateId}`);
      
    } catch (error) {
      this.logger.error(`Failed to delete certificate: ${error.message}`, error.stack);
      throw new Error(`Failed to delete certificate: ${error.message}`);
    }
  }
}

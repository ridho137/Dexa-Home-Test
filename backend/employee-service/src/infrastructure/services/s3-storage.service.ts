import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../../config/env';
import { AppLogger } from '../logger/app-logger.service';

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly logger: AppLogger) {
    this.bucket = env.s3.bucket;
    this.client = new S3Client({
      endpoint: env.s3.endpoint,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.s3.accessKeyId,
        secretAccessKey: env.s3.secretAccessKey,
      },
    });
  }

  async uploadObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          ACL: 'public-read',
        }),
      );
      this.logger.debug('S3StorageService: uploaded object', { key });
    } catch (err) {
      this.logger.error('S3StorageService: upload failed', { key, err });
      throw new InternalServerErrorException('PROFILE_UPLOAD_FAILED');
    }
  }

  buildPublicUrl(key: string): string {
    const endpoint = env.s3.endpoint.replace(/\/$/, '');
    return `${endpoint}/${this.bucket}/${key}`;
  }
}

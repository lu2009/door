import * as Minio from 'minio';
import { config } from '../config';

const minioClient = new Minio.Client({
  endPoint: config.minio.endpoint.split(':')[0],
  port: parseInt(config.minio.endpoint.split(':')[1] || '9000', 10),
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
  useSSL: config.minio.secure,
});

let bucketChecked = false;

async function ensureBucket(): Promise<void> {
  if (bucketChecked) return;
  const exists = await minioClient.bucketExists(config.minio.bucket);
  if (!exists) {
    await minioClient.makeBucket(config.minio.bucket);
  }
  bucketChecked = true;
}

export const minio = {
  async upload(objectName: string, data: Buffer, contentType = 'application/octet-stream'): Promise<string> {
    await ensureBucket();
    await minioClient.putObject(config.minio.bucket, objectName, data, data.length, { 'Content-Type': contentType });
    return objectName;
  },

  async download(objectName: string): Promise<Buffer | null> {
    try {
      const stream = await minioClient.getObject(config.minio.bucket, objectName);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch {
      return null;
    }
  },

  async delete(objectName: string): Promise<boolean> {
    try {
      await minioClient.removeObject(config.minio.bucket, objectName);
      return true;
    } catch {
      return false;
    }
  },

  async exists(objectName: string): Promise<boolean> {
    try {
      await minioClient.statObject(config.minio.bucket, objectName);
      return true;
    } catch {
      return false;
    }
  },

  async checkConnection(): Promise<boolean> {
    try {
      await ensureBucket();
      return true;
    } catch {
      return false;
    }
  },
};

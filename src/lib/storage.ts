import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageProvider {
  uploadFile(file: Buffer, fileName: string, folder: string): Promise<string>;
  getDownloadUrl(filePath: string): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9.-]/g, '_');
}

export class LocalStorageProvider implements StorageProvider {
  private uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

  private ensureInUploadDir(resolvedPath: string) {
    const relative = path.relative(this.uploadDir, resolvedPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Path traversal attempt detected');
    }
  }

  async uploadFile(file: Buffer, fileName: string, folder: string): Promise<string> {
    const sanitizedFolder = sanitizeSegment(folder);
    const sanitizedFileName = sanitizeSegment(fileName);

    if (!sanitizedFileName || sanitizedFileName === '.' || sanitizedFileName === '..') {
      throw new Error('Invalid filename');
    }

    const targetDir = path.resolve(this.uploadDir, sanitizedFolder);
    this.ensureInUploadDir(targetDir);

    await fs.mkdir(targetDir, { recursive: true });

    const timestamp = Date.now();
    const safeName = `${timestamp}-${sanitizedFileName}`;
    const filePath = path.resolve(targetDir, safeName);
    this.ensureInUploadDir(filePath);

    await fs.writeFile(filePath, file);
    return path.relative(this.uploadDir, filePath);
  }

  async getDownloadUrl(filePath: string): Promise<string> {
    return `/api/documents/download?path=${encodeURIComponent(filePath)}`;
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.resolve(this.uploadDir, filePath);
    this.ensureInUploadDir(fullPath);

    try {
      await fs.unlink(fullPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private client: S3Client;
  private urlTtlSeconds = 300; // 5-minute presigned URLs

  constructor() {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.AWS_REGION || 'us-east-1';
    if (!bucket) {
      throw new Error('STORAGE_DRIVER=s3 but S3_BUCKET is not set');
    }
    this.bucket = bucket;

    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    this.client = new S3Client({
      region,
      // Explicit credentials when IAM user keys are provided; otherwise the SDK
      // falls back to the default provider chain (env / EC2 instance profile).
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }

  async uploadFile(file: Buffer, fileName: string, folder: string): Promise<string> {
    const sanitizedFolder = sanitizeSegment(folder);
    const sanitizedFileName = sanitizeSegment(fileName);
    if (!sanitizedFileName || sanitizedFileName === '.' || sanitizedFileName === '..') {
      throw new Error('Invalid filename');
    }
    const key = `${sanitizedFolder}/${Date.now()}-${sanitizedFileName}`;

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: guessContentType(sanitizedFileName),
    }));

    return key;
  }

  async getDownloadUrl(filePath: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: filePath }),
      { expiresIn: this.urlTtlSeconds },
    );
  }

  async deleteFile(filePath: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: filePath }));
  }
}

function guessContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[ext] || 'application/octet-stream';
}

export const storage: StorageProvider =
  process.env.STORAGE_DRIVER === 's3' ? new S3StorageProvider() : new LocalStorageProvider();

import fs from 'fs/promises';
import path from 'path';

export interface StorageProvider {
  uploadFile(file: Buffer, fileName: string, folder: string): Promise<string>;
  getDownloadUrl(filePath: string): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
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
    // Basic sanitization of inputs
    const sanitizedFolder = folder.replace(/[^a-zA-Z0-9.-]/g, '_');
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

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
    // In a real local setup, this would point to a secure proxy route
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

export const storage = new LocalStorageProvider();

import type { ObjectStorageProvider } from './interfaces.js';

// ============================================================
// AWS S3 ObjectStorage stub
// ============================================================

export class AWSS3StorageProvider implements ObjectStorageProvider {
  async put(_key: string, _content: Buffer | string, _contentType?: string): Promise<string> {
    throw new Error('AWSS3StorageProvider.put not implemented');
  }
  async get(_key: string): Promise<Buffer> {
    throw new Error('AWSS3StorageProvider.get not implemented');
  }
  async presignedUrl(_key: string, _expiresInSeconds: number): Promise<string> {
    throw new Error('AWSS3StorageProvider.presignedUrl not implemented');
  }
  async delete(_key: string): Promise<void> {
    throw new Error('AWSS3StorageProvider.delete not implemented');
  }
  async exists(_key: string): Promise<boolean> {
    throw new Error('AWSS3StorageProvider.exists not implemented');
  }
}

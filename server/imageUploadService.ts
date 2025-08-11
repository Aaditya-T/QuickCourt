import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'quickcourt-images';

// Use public R2 URL - this should be configured for public access in Cloudflare
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 
  'https://pub-02f6c390de2f4928874315ec20ca20ec.r2.dev';

console.log('R2 Configuration:', {
  bucketName: R2_BUCKET_NAME,
  publicUrl: R2_PUBLIC_URL,
  hasDevUrl: !!process.env.R2_DEV_URL,
  hasCustomUrl: !!process.env.R2_PUBLIC_URL
});

// Initialize S3 client for R2 (will be created when needed)
let s3Client: S3Client | null = null;

const createS3Client = () => {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 configuration is missing');
  }
  
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
};

export interface UploadedImage {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

export class ImageUploadService {
  private static instance: ImageUploadService;

  private constructor() {}

  public static getInstance(): ImageUploadService {
    if (!ImageUploadService.instance) {
      ImageUploadService.instance = new ImageUploadService();
    }
    return ImageUploadService.instance;
  }

  /**
   * Upload an image file to R2
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'facilities'
  ): Promise<UploadedImage> {
    // Create S3 client if not exists
    if (!s3Client) {
      s3Client = createS3Client();
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const filename = `${folder}/${uuidv4()}${fileExtension}`;

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Note: R2 doesn't support ACL, so we'll rely on bucket-level permissions
    });

    try {
      await s3Client.send(uploadCommand);
    } catch (error: any) {
      if (error.name === 'NoSuchBucket') {
        throw new Error(`Bucket '${R2_BUCKET_NAME}' does not exist. Please create it in your Cloudflare R2 dashboard.`);
      }
      throw error;
    }

    // Return image info
    const uploadedImage: UploadedImage = {
      id: uuidv4(),
      filename,
      url: `${R2_PUBLIC_URL}/${filename}`,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date(),
    };

    return uploadedImage;
  }

  /**
   * Delete an image from R2
   */
  async deleteImage(filename: string): Promise<boolean> {
    try {
      // Create S3 client if not exists
      if (!s3Client) {
        s3Client = createS3Client();
      }

      const deleteCommand = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: filename,
      });

      await s3Client.send(deleteCommand);
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * Generate a presigned URL for direct uploads (if needed)
   */
  async generatePresignedUploadUrl(
    filename: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    // Create S3 client if not exists
    if (!s3Client) {
      s3Client = createS3Client();
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      ContentType: contentType,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Get image info from URL
   */
  getImageInfoFromUrl(url: string): { filename: string; folder: string } | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const filename = pathParts[pathParts.length - 1];
      const folder = pathParts[pathParts.length - 2];
      
      return { filename: `${folder}/${filename}`, folder };
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate file type and size
   */
  validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 5MB' };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
    }

    return { valid: true };
  }
}

export const imageUploadService = ImageUploadService.getInstance();

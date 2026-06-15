import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('Cloudinary successfully configured.');
} else {
  console.warn('Cloudinary credentials missing. Using local filesystem fallback for uploads.');
}

/**
 * Uploads a file to Cloudinary, or saves it locally as a fallback.
 * @param {string} filePath - Path to the local temporary file.
 * @param {string} folder - Destination folder name.
 * @returns {Promise<{imageUrl: string, cloudinaryId: string}>}
 */
export async function uploadImage(filePath, folder = 'wedding') {
  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: 'image',
      });
      return {
        imageUrl: result.secure_url,
        cloudinaryId: result.public_id,
      };
    } catch (error) {
      console.error('Cloudinary upload error, falling back to local:', error);
      // Fall through to local fallback on error
    }
  }

  // Local fallback: Copy file to public uploads directory
  try {
    const fileName = `${Date.now()}-${path.basename(filePath)}`;
    const publicUploadsDir = path.join(__dirname, '../../public/uploads');
    
    if (!fs.existsSync(publicUploadsDir)) {
      fs.mkdirSync(publicUploadsDir, { recursive: true });
    }

    const destPath = path.join(publicUploadsDir, fileName);
    fs.copyFileSync(filePath, destPath);

    // Return local URL and dummy cloudinary ID
    const localUrl = `/uploads/${fileName}`;
    return {
      imageUrl: localUrl,
      cloudinaryId: `local-${fileName}`,
    };
  } catch (error) {
    console.error('Local upload fallback error:', error);
    throw new Error('Failed to upload image');
  }
}

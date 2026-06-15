import prisma from '../config/prismaClient.js';
import { uploadImage } from '../config/cloudinary.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function uploadPhoto(req, res) {
  const { uploadedBy } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }

  try {
    const uploadResult = await uploadImage(req.file.path, 'gallery');

    const photo = await prisma.galleryPhoto.create({
      data: {
        uploadedBy: uploadedBy ? uploadedBy.trim() : 'Anonymous Guest',
        imageUrl: uploadResult.imageUrl,
        cloudinaryId: uploadResult.cloudinaryId,
        approved: false // Needs admin moderation
      }
    });

    // Delete temp file from disk if multer saved it in a temp dir
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (err) {
      console.error('Failed to delete temp upload file:', err);
    }

    res.status(201).json({
      message: 'Photo uploaded successfully! It will be visible in the gallery once approved by the hosts.',
      photo
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getApprovedPhotos(req, res) {
  try {
    const photos = await prisma.galleryPhoto.findMany({
      where: { approved: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(photos);
  } catch (error) {
    console.error('Error fetching gallery photos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function moderatePhoto(req, res) {
  const { id } = req.params;
  const { action } = req.body; // 'approve' or 'reject'

  if (!action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be "approve" or "reject".' });
  }

  try {
    const photo = await prisma.galleryPhoto.findUnique({
      where: { id: parseInt(id) }
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found.' });
    }

    if (action === 'approve') {
      const updatedPhoto = await prisma.galleryPhoto.update({
        where: { id: photo.id },
        data: { approved: true }
      });
      return res.json({ message: 'Photo approved successfully!', photo: updatedPhoto });
    } else {
      // Reject: delete from storage and database
      // 1. Delete from Cloudinary or local file system
      if (photo.cloudinaryId.startsWith('local-')) {
        const fileName = photo.cloudinaryId.replace('local-', '');
        const filePath = path.join(__dirname, '../../public/uploads', fileName);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error('Failed to delete local file on rejection:', err);
        }
      } else {
        try {
          await cloudinary.uploader.destroy(photo.cloudinaryId);
        } catch (err) {
          console.error('Failed to delete Cloudinary asset on rejection:', err);
        }
      }

      // 2. Delete from DB
      await prisma.galleryPhoto.delete({
        where: { id: photo.id }
      });

      return res.json({ message: 'Photo rejected and deleted successfully!' });
    }
  } catch (error) {
    console.error('Error moderating photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

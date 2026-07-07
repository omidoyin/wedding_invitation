import prisma from '../config/prismaClient.js';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary for moderation (delete on reject)
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function uploadPhoto(req, res) {
  const { imageUrl, cloudinaryId, uploadedBy } = req.body;

  if (!imageUrl || !cloudinaryId) {
    return res.status(400).json({ error: 'imageUrl and cloudinaryId are required.' });
  }

  try {
    const photo = await prisma.galleryPhoto.create({
      data: {
        uploadedBy: uploadedBy ? uploadedBy.trim() : 'Anonymous Guest',
        imageUrl,
        cloudinaryId,
        approved: false // Needs admin moderation
      }
    });

    res.status(201).json({
      message: 'Photo uploaded successfully! It will be visible in the gallery once approved by the hosts.',
      photo
    });
  } catch (error) {
    console.error('Error saving photo to database:', error);
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
      // Reject: delete from Cloudinary and database
      try {
        await cloudinary.uploader.destroy(photo.cloudinaryId);
      } catch (err) {
        console.error('Failed to delete Cloudinary asset on rejection:', err);
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

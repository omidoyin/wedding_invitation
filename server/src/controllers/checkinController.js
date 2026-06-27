import prisma from '../config/prismaClient.js';
import { uploadImage } from '../config/cloudinary.js';

export async function searchGuest(req, res) {
  const { query } = req.query; // query can be serial number or attendee name

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  const searchTerm = query.trim();

  try {
    // 1. Search by serial number (exact match) or by familyName/attendee name (partial match)
    // We fetch RSVPs matching the query
    const rsvps = await prisma.rSVP.findMany({
      where: {
        OR: [
          { serialNumber: { equals: searchTerm } },
          { invite: { familyName: { contains: searchTerm } } },
          { attendees: { some: { fullName: { contains: searchTerm } } } }
        ]
      },
      include: {
        invite: true,
        attendees: true
      }
    });

    res.json(rsvps);
  } catch (error) {
    console.error('Error searching guest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function checkIn(req, res) {
  const { serialNumber } = req.body;

  if (!serialNumber) {
    return res.status(400).json({ error: 'Serial number is required.' });
  }

  try {
    const rsvp = await prisma.rSVP.findUnique({
      where: { serialNumber: serialNumber },
      include: { invite: true }
    });

    if (!rsvp) {
      return res.status(404).json({ error: 'RSVP record not found for this serial number.' });
    }

    if (rsvp.checkedIn) {
      return res.status(400).json({ error: 'This guest has already checked in.' });
    }

    let checkInPhotoUrl = null;

    // Handle checkin photo upload if file was sent
    if (req.file) {
      try {
        const uploadResult = await uploadImage(req.file.path, 'checkins');
        checkInPhotoUrl = uploadResult.imageUrl;
      } catch (uploadError) {
        console.error('Failed to upload check-in photo:', uploadError);
        return res.status(500).json({ error: 'Failed to process check-in photo upload.' });
      }
    }

    // Update RSVP record
    const updatedRSVP = await prisma.rSVP.update({
      where: { id: rsvp.id },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
        checkInPhoto: checkInPhotoUrl,
        checkedOut: false,
        checkedOutAt: null
      },
      include: {
        attendees: true,
        invite: true
      }
    });

    res.json({
      message: 'Check-in successful!',
      familyName: updatedRSVP.invite.familyName,
      serialNumber: updatedRSVP.serialNumber,
      attendanceCount: updatedRSVP.attendanceCount,
      attendees: updatedRSVP.attendees,
      checkedInAt: updatedRSVP.checkedInAt,
      checkInPhoto: updatedRSVP.checkInPhoto
    });
  } catch (error) {
    console.error('Error during check-in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function checkOut(req, res) {
  const { serialNumber } = req.body;

  if (!serialNumber) {
    return res.status(400).json({ error: 'Serial number is required.' });
  }

  try {
    const rsvp = await prisma.rSVP.findUnique({
      where: { serialNumber: serialNumber },
      include: { invite: true }
    });

    if (!rsvp) {
      return res.status(404).json({ error: 'RSVP record not found for this serial number.' });
    }

    if (!rsvp.checkedIn) {
      return res.status(400).json({ error: 'This guest is not currently checked in.' });
    }

    // Update RSVP record
    const updatedRSVP = await prisma.rSVP.update({
      where: { id: rsvp.id },
      data: {
        checkedIn: false,
        checkedOut: true,
        checkedOutAt: new Date()
      },
      include: {
        attendees: true,
        invite: true
      }
    });

    res.json({
      message: 'Check-out successful!',
      familyName: updatedRSVP.invite.familyName,
      serialNumber: updatedRSVP.serialNumber,
      attendanceCount: updatedRSVP.attendanceCount,
      checkedOutAt: updatedRSVP.checkedOutAt
    });
  } catch (error) {
    console.error('Error during check-out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

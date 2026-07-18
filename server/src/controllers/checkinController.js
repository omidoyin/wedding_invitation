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
          { attendees: { some: { fullName: { contains: searchTerm } } } },
          { attendees: { some: { serialNumber: { equals: searchTerm } } } }
        ]
      },
      include: {
        invite: true,
        attendees: {
          include: {
            table: true
          }
        }
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
    // 1. Try to find the Attendee by serialNumber
    let attendee = await prisma.attendee.findUnique({
      where: { serialNumber: serialNumber },
      include: {
        rsvp: {
          include: { invite: true }
        }
      }
    });

    // 2. Fallback: if not found, check if it matches the parent RSVP serialNumber
    if (!attendee) {
      const rsvp = await prisma.rSVP.findUnique({
        where: { serialNumber: serialNumber },
        include: {
          invite: true,
          attendees: {
            take: 1
          }
        }
      });
      if (rsvp && rsvp.attendees.length > 0) {
        attendee = await prisma.attendee.findUnique({
          where: { id: rsvp.attendees[0].id },
          include: {
            rsvp: {
              include: { invite: true }
            }
          }
        });
      }
    }

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee record not found for this serial number.' });
    }

    if (attendee.checkedIn) {
      return res.status(400).json({ error: `${attendee.fullName} is already checked in.` });
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

    // Update Attendee record
    const updatedAttendee = await prisma.attendee.update({
      where: { id: attendee.id },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
        checkInPhoto: checkInPhotoUrl,
        checkedOut: false,
        checkedOutAt: null
      },
      include: {
        rsvp: {
          include: {
            invite: true,
            attendees: {
              include: {
                table: true
              }
            }
          }
        }
      }
    });

    // Also update parent RSVP status for compatibility
    await prisma.rSVP.update({
      where: { id: attendee.rsvpId },
      data: {
        checkedIn: true,
        checkedInAt: new Date()
      }
    });

    res.json({
      message: 'Check-in successful!',
      familyName: updatedAttendee.rsvp.invite.familyName,
      serialNumber: updatedAttendee.serialNumber,
      attendanceCount: updatedAttendee.rsvp.attendanceCount,
      attendees: updatedAttendee.rsvp.attendees,
      checkedInAt: updatedAttendee.checkedInAt,
      checkInPhoto: updatedAttendee.checkInPhoto
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
    let attendee = await prisma.attendee.findUnique({
      where: { serialNumber: serialNumber },
      include: {
        rsvp: {
          include: { invite: true }
        }
      }
    });

    if (!attendee) {
      const rsvp = await prisma.rSVP.findUnique({
        where: { serialNumber: serialNumber },
        include: {
          invite: true,
          attendees: {
            take: 1
          }
        }
      });
      if (rsvp && rsvp.attendees.length > 0) {
        attendee = await prisma.attendee.findUnique({
          where: { id: rsvp.attendees[0].id },
          include: {
            rsvp: {
              include: { invite: true }
            }
          }
        });
      }
    }

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee record not found for this serial number.' });
    }

    if (!attendee.checkedIn) {
      return res.status(400).json({ error: `${attendee.fullName} is not currently checked in.` });
    }

    // Update Attendee record
    const updatedAttendee = await prisma.attendee.update({
      where: { id: attendee.id },
      data: {
        checkedIn: false,
        checkedOut: true,
        checkedOutAt: new Date()
      },
      include: {
        rsvp: {
          include: {
            invite: true,
            attendees: true
          }
        }
      }
    });

    // Also update parent RSVP's checkedOut status if all attendees are checked out
    const remainingCheckedIn = await prisma.attendee.count({
      where: {
        rsvpId: attendee.rsvpId,
        checkedIn: true
      }
    });

    if (remainingCheckedIn === 0) {
      await prisma.rSVP.update({
        where: { id: attendee.rsvpId },
        data: {
          checkedIn: false,
          checkedOut: true,
          checkedOutAt: new Date()
        }
      });
    }

    res.json({
      message: 'Check-out successful!',
      familyName: updatedAttendee.rsvp.invite.familyName,
      serialNumber: updatedAttendee.serialNumber,
      attendanceCount: updatedAttendee.rsvp.attendanceCount,
      checkedOutAt: updatedAttendee.checkedOutAt
    });
  } catch (error) {
    console.error('Error during check-out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function assignSeat(req, res) {
  const { serialNumber, seatNumber } = req.body;

  if (!serialNumber || !seatNumber) {
    return res.status(400).json({ error: 'Serial number and seat number are required.' });
  }

  try {
    const attendee = await prisma.attendee.findUnique({
      where: { serialNumber: serialNumber.trim() }
    });

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found for this serial number.' });
    }

    const updated = await prisma.attendee.update({
      where: { id: attendee.id },
      data: { seatNumber: seatNumber.trim() }
    });

    res.json({
      message: `Seat ${seatNumber} assigned to ${updated.fullName}.`,
      serialNumber: updated.serialNumber,
      fullName: updated.fullName,
      seatNumber: updated.seatNumber
    });
  } catch (error) {
    console.error('Error assigning seat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

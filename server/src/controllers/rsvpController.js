import prisma from '../config/prismaClient.js';
import QRCode from 'qrcode';

// Helper to generate a random unique serial number: AAL-XXXXXX
async function generateUniqueSerial(txClient) {
  const client = txClient || prisma;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let serial = '';

  while (!isUnique) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    serial = `AAL-${code}`;

    // Check uniqueness in database (both RSVP and Attendee)
    const existingRsvp = await client.rSVP.findUnique({
      where: { serialNumber: serial }
    });
    const existingAttendee = await client.attendee.findUnique({
      where: { serialNumber: serial }
    });
    if (!existingRsvp && !existingAttendee) {
      isUnique = true;
    }
  }

  return serial;
}

// Helper to generate a random unique attendee serial number: AAL-XXXXXX
async function generateUniqueAttendeeSerial(txClient) {
  return generateUniqueSerial(txClient);
}

// Helper to generate a random unique attendee token: att-XXXXXXXXXX
async function generateUniqueAttendeeToken(txClient) {
  const client = txClient || prisma;
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let token = '';

  while (!isUnique) {
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    token = `att-${code}`;

    // Check uniqueness in database (Invite and Attendee)
    const existingInvite = await client.invite.findUnique({
      where: { inviteToken: token }
    });
    const existingAttendee = await client.attendee.findUnique({
      where: { attendeeToken: token }
    });
    if (!existingInvite && !existingAttendee) {
      isUnique = true;
    }
  }

  return token;
}

export async function submitRSVP(req, res) {
  const { inviteId, attendees, anyChildren, childrenCount } = req.body;

  if (!inviteId || !Array.isArray(attendees) || attendees.length === 0) {
    return res.status(400).json({ error: 'Invite ID and attendee list are required.' });
  }

  try {
    // Fetch the invite to validate maxGuests
    const invite = await prisma.invite.findUnique({
      where: { id: parseInt(inviteId) },
      include: { 
        rsvp: {
          include: {
            attendees: true
          }
        } 
      }
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found.' });
    }

    // Validate attendee names are present
    for (const att of attendees) {
      if (!att.fullName || att.fullName.trim() === '') {
        return res.status(400).json({ error: 'All attendees must have a valid name.' });
      }
    }

    // Check if an RSVP already exists for this invitation
    if (invite.rsvpSubmitted && invite.rsvp) {
      const existingAttendees = invite.rsvp.attendees || [];
      const currentCount = existingAttendees.length;
      const remainingSlots = invite.maxGuests - currentCount;

      if (remainingSlots <= 0) {
        return res.status(400).json({ 
          error: `All ${invite.maxGuests} guest slot(s) for this invitation have already been registered.` 
        });
      }

      if (attendees.length > remainingSlots) {
        return res.status(400).json({ 
          error: `Exceeded remaining guest limit. Remaining slots available: ${remainingSlots}, Submitted: ${attendees.length}` 
        });
      }

      // Append new attendees to the existing RSVP
      const result = await prisma.$transaction(async (tx) => {
        const attendeeData = [];
        for (let i = 0; i < attendees.length; i++) {
          const att = attendees[i];
          const attSerial = await generateUniqueAttendeeSerial(tx);
          const attToken = await generateUniqueAttendeeToken(tx);
          const registeredBy = existingAttendees[0]?.fullName || attendees[0].fullName.trim();

          attendeeData.push({
            rsvpId: invite.rsvp.id,
            fullName: att.fullName.trim(),
            phoneNumber: att.phoneNumber ? att.phoneNumber.trim() : null,
            serialNumber: attSerial,
            attendeeToken: attToken,
            registeredBy: registeredBy
          });
        }

        await tx.attendee.createMany({
          data: attendeeData
        });

        // Update total attendanceCount on RSVP
        const updatedRsvp = await tx.rSVP.update({
          where: { id: invite.rsvp.id },
          data: {
            attendanceCount: currentCount + attendees.length
          },
          include: {
            attendees: true
          }
        });

        return { rsvp: updatedRsvp, attendees: updatedRsvp.attendees };
      });

      return res.status(200).json({
        message: 'Additional guest(s) added successfully!',
        serialNumber: result.rsvp.serialNumber,
        qrCode: result.rsvp.qrCode,
        attendanceCount: result.rsvp.attendanceCount,
        familyName: invite.familyName,
        seatingPublished: Boolean(invite.seatingPublished),
        attendees: result.attendees
      });
    }

    // Initial RSVP creation flow (when invite.rsvp is not created yet)
    if (attendees.length > invite.maxGuests) {
      return res.status(400).json({ 
        error: `Exceeded maximum guest limit. Allowed: ${invite.maxGuests}, Submitted: ${attendees.length}` 
      });
    }

    // Generate serial number and QR Code data URL
    const serialNumber = await generateUniqueSerial();
    const qrCodeDataUrl = await QRCode.toDataURL(serialNumber);

    // Save everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create RSVP
      const rsvp = await tx.rSVP.create({
        data: {
          inviteId: invite.id,
          attendanceCount: attendees.length,
          serialNumber: serialNumber,
          qrCode: qrCodeDataUrl,
          checkedIn: false,
          anyChildren: anyChildren || false,
          childrenCount: childrenCount ? parseInt(childrenCount) : 0
        }
      });

      // 2. Create Attendees with unique serials, tokens, and registeredBy info
      const attendeeData = [];
      for (let i = 0; i < attendees.length; i++) {
        const att = attendees[i];
        const attSerial = await generateUniqueAttendeeSerial(tx);
        const attToken = await generateUniqueAttendeeToken(tx);
        const registeredBy = i > 0 ? attendees[0].fullName.trim() : null;

        attendeeData.push({
          rsvpId: rsvp.id,
          fullName: att.fullName.trim(),
          phoneNumber: att.phoneNumber ? att.phoneNumber.trim() : null,
          serialNumber: attSerial,
          attendeeToken: attToken,
          registeredBy: registeredBy
        });
      }

      await tx.attendee.createMany({
        data: attendeeData
      });

      // 3. Update Invite status
      await tx.invite.update({
        where: { id: invite.id },
        data: { rsvpSubmitted: true }
      });

      const fullRsvp = await tx.rSVP.findUnique({
        where: { id: rsvp.id },
        include: { attendees: true }
      });

      return { rsvp: fullRsvp, attendees: fullRsvp.attendees };
    });

    return res.status(201).json({
      message: 'RSVP submitted successfully!',
      serialNumber: result.rsvp.serialNumber,
      qrCode: result.rsvp.qrCode,
      attendanceCount: result.rsvp.attendanceCount,
      familyName: invite.familyName,
      seatingPublished: Boolean(invite.seatingPublished),
      attendees: result.attendees
    });
  } catch (error) {
    console.error('Error submitting RSVP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

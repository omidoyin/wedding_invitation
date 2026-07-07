import prisma from '../config/prismaClient.js';

export async function getInviteByToken(req, res) {
  const { token } = req.params;

  try {
    // Try to find by family inviteToken
    let invite = await prisma.invite.findUnique({
      where: { inviteToken: token },
      include: { 
        rsvp: {
          include: {
            attendees: true
          }
        }
      }
    });

    let isAttendee = false;
    let currentAttendee = null;

    if (!invite) {
      // Try to find by attendeeToken
      const attendee = await prisma.attendee.findUnique({
        where: { attendeeToken: token },
        include: {
          rsvp: {
            include: {
              invite: true,
              attendees: true
            }
          }
        }
      });

      if (!attendee) {
        return res.status(404).json({ error: 'Invitation link not found or invalid.' });
      }

      isAttendee = true;
      currentAttendee = {
        id: attendee.id,
        fullName: attendee.fullName,
        serialNumber: attendee.serialNumber,
        attendeeToken: attendee.attendeeToken,
        registeredBy: attendee.registeredBy
      };

      const parentInvite = attendee.rsvp.invite;
      invite = {
        id: parentInvite.id,
        familyName: parentInvite.familyName,
        inviteToken: parentInvite.inviteToken,
        category: parentInvite.category,
        maxGuests: parentInvite.maxGuests,
        invitationOpened: parentInvite.invitationOpened,
        rsvpSubmitted: parentInvite.rsvpSubmitted,
        rsvp: {
          id: attendee.rsvp.id,
          inviteId: attendee.rsvp.inviteId,
          attendanceCount: attendee.rsvp.attendanceCount,
          serialNumber: attendee.rsvp.serialNumber,
          qrCode: attendee.rsvp.qrCode,
          checkedIn: attendee.rsvp.checkedIn,
          checkedInAt: attendee.rsvp.checkedInAt,
          checkInPhoto: attendee.rsvp.checkInPhoto,
          checkedOut: attendee.rsvp.checkedOut,
          checkedOutAt: attendee.rsvp.checkedOutAt,
          createdAt: attendee.rsvp.createdAt,
          attendees: attendee.rsvp.attendees
        }
      };
    }

    // Mark invitation as opened if not already opened
    if (!invite.invitationOpened) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { invitationOpened: true }
      });
    }

    res.json({
      id: invite.id,
      familyName: invite.familyName,
      inviteToken: invite.inviteToken,
      category: invite.category,
      maxGuests: invite.maxGuests,
      invitationOpened: true,
      rsvpSubmitted: invite.rsvpSubmitted,
      rsvp: invite.rsvp,
      isAttendee,
      currentAttendee
    });
  } catch (error) {
    console.error('Error fetching invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

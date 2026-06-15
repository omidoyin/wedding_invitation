import prisma from '../config/prismaClient.js';

export async function getInviteByToken(req, res) {
  const { token } = req.params;

  try {
    const invite = await prisma.invite.findUnique({
      where: { inviteToken: token },
      include: { rsvp: true }
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invitation link not found or invalid.' });
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
      rsvp: invite.rsvp
    });
  } catch (error) {
    console.error('Error fetching invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

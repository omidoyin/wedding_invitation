import prisma from '../config/prismaClient.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import exceljs from 'exceljs';

// JWT Secret helper
const JWT_SECRET = process.env.JWT_SECRET || 'aalovestory_secret_key_2026_super_secure';

// Helper to generate a slug + random token
function generateInviteToken(familyName) {
  const slug = familyName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-alphanumeric except spaces and hyphens
    .replace(/[\s_]+/g, '-')   // replace spaces/underscores with hyphens
    .replace(/-+/g, '-');      // remove duplicate hyphens
  
  const randomChars = Math.random().toString(36).substring(2, 6); // 4 random characters
  return `${slug}-${randomChars}`;
}

export async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { username: username.trim() }
    });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        username: admin.username,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createInvite(req, res) {
  const { familyName, category, maxGuests, side } = req.body;

  if (!familyName || !category || !maxGuests) {
    return res.status(400).json({ error: 'Family name, category, and max guests are required.' });
  }

  try {
    const token = generateInviteToken(familyName);

    const invite = await prisma.invite.create({
      data: {
        familyName: familyName.trim(),
        category: category.trim(),
        maxGuests: parseInt(maxGuests),
        inviteToken: token,
        side: side ? side.trim() : 'Neutral'
      }
    });

    res.status(201).json({
      message: 'Invitation generated successfully!',
      invite
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getInvites(req, res) {
  try {
    const invites = await prisma.invite.findMany({
      include: { rsvp: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invites);
  } catch (error) {
    console.error('Error fetching invites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getDashboardStats(req, res) {
  try {
    const totalInvitesCount = await prisma.invite.count();
    const totalRSVPsCount = await prisma.invite.count({ where: { rsvpSubmitted: true } });
    
    // Checked in invites/families
    const checkedInFamilies = await prisma.rSVP.count({ where: { checkedIn: true } });

    // Total actual attendees checked in
    const checkedInAttendees = await prisma.attendee.count({
      where: { checkedIn: true }
    });

    // Total expected attendees from RSVPs
    const rsvpSummaries = await prisma.rSVP.aggregate({
      _sum: {
        attendanceCount: true
      }
    });
    const totalExpectedGuests = rsvpSummaries._sum.attendanceCount || 0;

    // Total donations
    const donationSummaries = await prisma.donation.aggregate({
      where: { status: 'SUCCESS' },
      _sum: {
        amount: true
      }
    });
    const totalDonations = donationSummaries._sum.amount || 0;

    // Total pending gallery photos
    const pendingPhotosCount = await prisma.galleryPhoto.count({ where: { approved: false } });

    res.json({
      totalInvites: totalInvitesCount,
      totalRSVPs: totalRSVPsCount,
      checkedInFamilies,
      checkedInAttendees,
      totalExpectedGuests,
      totalDonations,
      pendingPhotosCount
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function exportGuests(req, res) {
  try {
    const workbook = new exceljs.Workbook();
    
    // 1. Sheet: RSVP & Guests List
    const rsvpSheet = workbook.addWorksheet('RSVPs & Guests');
    rsvpSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Family Name', key: 'familyName', width: 25 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Side', key: 'side', width: 15 },
      { header: 'Max Allowed Guests', key: 'maxGuests', width: 18 },
      { header: 'RSVP Status', key: 'rsvpStatus', width: 15 },
      { header: 'Attendance Count', key: 'attendanceCount', width: 18 },
      { header: 'Children Attending', key: 'childrenAttending', width: 18 },
      { header: 'Children Count', key: 'childrenCount', width: 15 },
      { header: 'Serial Number', key: 'serialNumber', width: 15 },
      { header: 'Checked In', key: 'checkedIn', width: 12 },
      { header: 'Checked In At', key: 'checkedInAt', width: 22 },
      { header: 'Seating Published', key: 'seatingPublished', width: 18 },
      { header: 'Check In Photo', key: 'checkInPhoto', width: 30 }
    ];

    // Style headers
    rsvpSheet.getRow(1).font = { bold: true };

    const invites = await prisma.invite.findMany({
      include: {
        rsvp: {
          include: {
            attendees: true
          }
        }
      }
    });

    invites.forEach((invite) => {
      rsvpSheet.addRow({
        id: invite.id,
        familyName: invite.familyName,
        category: invite.category,
        side: invite.side,
        maxGuests: invite.maxGuests,
        rsvpStatus: invite.rsvpSubmitted ? 'Submitted' : 'Pending',
        attendanceCount: invite.rsvp ? invite.rsvp.attendanceCount : 0,
        childrenAttending: invite.rsvp ? (invite.rsvp.anyChildren ? 'Yes' : 'No') : 'N/A',
        childrenCount: invite.rsvp ? invite.rsvp.childrenCount : 0,
        serialNumber: invite.rsvp ? invite.rsvp.serialNumber : 'N/A',
        checkedIn: invite.rsvp ? (invite.rsvp.checkedIn ? 'Yes' : 'No') : 'N/A',
        checkedInAt: invite.rsvp && invite.rsvp.checkedInAt ? invite.rsvp.checkedInAt.toISOString() : 'N/A',
        seatingPublished: invite.seatingPublished ? 'Yes' : 'No',
        checkInPhoto: invite.rsvp && invite.rsvp.checkInPhoto ? invite.rsvp.checkInPhoto : 'N/A'
      });
    });

    // 2. Sheet: Individual Attendees Detail
    const attendeesSheet = workbook.addWorksheet('Attendee Names');
    attendeesSheet.columns = [
      { header: 'Attendee ID', key: 'id', width: 12 },
      { header: 'Full Name', key: 'fullName', width: 25 },
      { header: 'Phone Number', key: 'phoneNumber', width: 18 },
      { header: 'Family / Invite Group', key: 'familyName', width: 25 },
      { header: 'Side', key: 'side', width: 15 },
      { header: 'Serial Number', key: 'serialNumber', width: 15 },
      { header: 'Assigned Table', key: 'tableName', width: 18 },
      { header: 'Seat Number', key: 'seatNumber', width: 15 },
      { header: 'Bouncer Check-In Status', key: 'checkInStatus', width: 18 }
    ];
    attendeesSheet.getRow(1).font = { bold: true };

    const attendees = await prisma.attendee.findMany({
      include: {
        table: true,
        rsvp: {
          include: {
            invite: true
          }
        }
      }
    });

    attendees.forEach((att) => {
      attendeesSheet.addRow({
        id: att.id,
        fullName: att.fullName,
        phoneNumber: att.phoneNumber || 'N/A',
        familyName: att.rsvp.invite.familyName,
        side: att.rsvp.invite.side,
        serialNumber: att.serialNumber,
        tableName: att.table ? att.table.name : 'Not Assigned',
        seatNumber: att.seatNumber || 'Not Assigned',
        checkInStatus: att.checkedIn ? 'Checked In' : 'Not Checked In'
      });
    });

    // 3. Sheet: Donations
    const donationsSheet = workbook.addWorksheet('Donations');
    donationsSheet.columns = [
      { header: 'Donation ID', key: 'id', width: 12 },
      { header: 'Donor Name', key: 'donorName', width: 25 },
      { header: 'Amount (NGN)', key: 'amount', width: 15 },
      { header: 'Reference', key: 'reference', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Date', key: 'date', width: 22 }
    ];
    donationsSheet.getRow(1).font = { bold: true };

    const donations = await prisma.donation.findMany({
      where: { status: 'SUCCESS' }
    });

    donations.forEach((donation) => {
      donationsSheet.addRow({
        id: donation.id,
        donorName: donation.donorName || 'Anonymous',
        amount: donation.amount,
        reference: donation.reference,
        status: donation.status,
        date: donation.createdAt.toISOString()
      });
    });

    // Send response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'AALOVESTORY2026_Wedding_Report.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting guests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getPendingPhotos(req, res) {
  try {
    const photos = await prisma.galleryPhoto.findMany({
      where: { approved: false },
      orderBy: { createdAt: 'desc' }
    });
    res.json(photos);
  } catch (error) {
    console.error('Error fetching pending photos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTables(req, res) {
  try {
    const tables = await prisma.table.findMany({
      include: {
        attendees: {
          include: {
            rsvp: {
              include: {
                invite: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createTable(req, res) {
  const { name, capacity, side, category } = req.body;
  if (!name || !capacity) {
    return res.status(400).json({ error: 'Table name and capacity are required.' });
  }
  try {
    const table = await prisma.table.create({
      data: {
        name: name.trim(),
        capacity: parseInt(capacity),
        side: side ? side.trim() : 'Neutral',
        category: category ? category.trim() : null
      }
    });
    res.status(201).json(table);
  } catch (error) {
    console.error('Error creating table:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A table with this name already exists.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateTable(req, res) {
  const { id } = req.params;
  const { name, capacity, side, category } = req.body;
  try {
    const table = await prisma.table.update({
      where: { id: parseInt(id) },
      data: {
        name: name ? name.trim() : undefined,
        capacity: capacity ? parseInt(capacity) : undefined,
        side: side ? side.trim() : undefined,
        category: category !== undefined ? (category ? category.trim() : null) : undefined
      }
    });
    res.json(table);
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteTable(req, res) {
  const { id } = req.params;
  try {
    await prisma.table.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Table deleted successfully.' });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function assignSeating(req, res) {
  const { rsvpId, tableId, keepFamily, assignments } = req.body;

  // --- Legacy mode: raw assignments array ---
  if (Array.isArray(assignments)) {
    try {
      await prisma.$transaction(
        assignments.map((asm) =>
          prisma.attendee.update({
            where: { id: asm.attendeeId },
            data: { tableId: asm.tableId, seatNumber: asm.seatNumber }
          })
        )
      );
      return res.json({ message: 'Seating assignments updated successfully.' });
    } catch (error) {
      console.error('Error assigning seating (legacy):', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // --- New mode: assign entire RSVP group to a table ---
  if (!rsvpId) {
    return res.status(400).json({ error: 'rsvpId is required.' });
  }

  try {
    // Fetch the RSVP with all attendees
    const rsvp = await prisma.rSVP.findUnique({
      where: { id: parseInt(rsvpId) },
      include: { attendees: true }
    });
    if (!rsvp) return res.status(404).json({ error: 'RSVP not found.' });

    // If tableId is provided, check capacity
    if (tableId !== null && tableId !== undefined) {
      const table = await prisma.table.findUnique({
        where: { id: parseInt(tableId) },
        include: { attendees: true }
      });
      if (!table) return res.status(404).json({ error: 'Table not found.' });

      // Count how many attendees from this rsvp are already at this table
      const alreadyAtTable = table.attendees.filter(a => a.rsvpId === rsvp.id).length;
      const slotsUsedByOthers = table.attendees.length - alreadyAtTable;
      const newCount = keepFamily !== false ? rsvp.attendees.length : 1;

      if (slotsUsedByOthers + newCount > table.capacity) {
        return res.status(400).json({
          error: `Table "${table.name}" doesn't have enough space. Capacity: ${table.capacity}, available: ${table.capacity - slotsUsedByOthers}, needed: ${newCount}.`
        });
      }
    }

    // Determine which attendees to update
    const attendeesToUpdate = keepFamily !== false ? rsvp.attendees : rsvp.attendees.slice(0, 1);
    const targetTableId = tableId !== null && tableId !== undefined ? parseInt(tableId) : null;

    await prisma.$transaction(
      attendeesToUpdate.map(att =>
        prisma.attendee.update({
          where: { id: att.id },
          data: { tableId: targetTableId }
        })
      )
    );

    res.json({ message: 'Seating assignment updated successfully.' });
  } catch (error) {
    console.error('Error assigning seating:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function publishSeating(req, res) {
  // Accept both 'published' and 'publish' for flexibility
  const shouldPublish = req.body.published ?? req.body.publish;
  if (shouldPublish === undefined || shouldPublish === null) {
    return res.status(400).json({ error: 'published boolean is required.' });
  }
  try {
    await prisma.invite.updateMany({
      data: { seatingPublished: Boolean(shouldPublish) }
    });
    res.json({ message: `Seating assignments ${shouldPublish ? 'published' : 'hidden'} successfully.` });
  } catch (error) {
    console.error('Error publishing seating:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

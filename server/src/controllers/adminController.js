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
  const { familyName, category, maxGuests } = req.body;

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
        inviteToken: token
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
      { header: 'Max Allowed Guests', key: 'maxGuests', width: 18 },
      { header: 'RSVP Status', key: 'rsvpStatus', width: 15 },
      { header: 'Attendance Count', key: 'attendanceCount', width: 18 },
      { header: 'Serial Number', key: 'serialNumber', width: 15 },
      { header: 'Checked In', key: 'checkedIn', width: 12 },
      { header: 'Checked In At', key: 'checkedInAt', width: 22 },
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
        maxGuests: invite.maxGuests,
        rsvpStatus: invite.rsvpSubmitted ? 'Submitted' : 'Pending',
        attendanceCount: invite.rsvp ? invite.rsvp.attendanceCount : 0,
        serialNumber: invite.rsvp ? invite.rsvp.serialNumber : 'N/A',
        checkedIn: invite.rsvp ? (invite.rsvp.checkedIn ? 'Yes' : 'No') : 'N/A',
        checkedInAt: invite.rsvp && invite.rsvp.checkedInAt ? invite.rsvp.checkedInAt.toISOString() : 'N/A',
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
      { header: 'Serial Number', key: 'serialNumber', width: 15 },
      { header: 'Bouncer Check-In Status', key: 'checkInStatus', width: 18 }
    ];
    attendeesSheet.getRow(1).font = { bold: true };

    const attendees = await prisma.attendee.findMany({
      include: {
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
        serialNumber: att.serialNumber,
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

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

import prisma from './config/prismaClient.js';
import inviteRoutes from './routes/inviteRoutes.js';
import rsvpRoutes from './routes/rsvpRoutes.js';
import checkinRoutes from './routes/checkinRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import paystackRoutes from './routes/paystackRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow local images to be loaded by frontend
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173' || 'https://wedding-invitation-9gox.onrender.com',
  credentials: true
}));

// Rate Limiting to prevent spam
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

app.use(express.json());

// Set up public static folders for locally uploaded images
const publicDir = path.join(__dirname, '../public');
const uploadsDir = path.join(publicDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Mount routes
app.use('/api/invite', inviteRoutes);
app.use('/api/rsvp', rsvpRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/paystack', paystackRoutes);
app.use('/api/admin', adminRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Wedding invitation server is running perfectly.' });
});

// DB heartbeat — wakes up Supabase connection pool
app.get('/api/aalovestory2026heart', async (_req, res) => {
  try {
    // Ping the DB using a lightweight Prisma query against an existing table
    await prisma.admin.count();
    res.status(200).json({ status: 'alive', heart: 'beating' });
  } catch (err) {
    console.error('[Heart] Heartbeat check failed:', err.message);
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

// Seed default users if they don't exist
async function seedDefaultUsers() {
  try {
    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      const bouncerPasswordHash = await bcrypt.hash('bouncer123', 10);

      await prisma.admin.createMany({
        data: [
          {
            username: 'admin',
            password: adminPasswordHash,
            role: 'Admin'
          },
          {
            username: 'bouncer',
            password: bouncerPasswordHash,
            role: 'Staff/Bouncer'
          }
        ]
      });
      console.log('Seeded default admin (username: admin) and bouncer (username: bouncer) accounts.');
    }

    const inviteCount = await prisma.invite.count();
    if (inviteCount === 0) {
      await prisma.invite.create({
        data: {
          familyName: 'The Test Family',
          inviteToken: 'test-invite',
          category: 'Family',
          maxGuests: 3
        }
      });
      console.log('Seeded default test invitation (token: test-invite).');
    }
  } catch (error) {
    console.error('Error seeding default users:', error);
  }
}

// Start Server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Verify database connection on startup
  try {
    await prisma.$connect();
    console.log('Database connected successfully.');
    await seedDefaultUsers();
  } catch (dbError) {
    console.error('Failed to connect to the database:', dbError);
  }
});

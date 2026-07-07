import { PrismaClient } from '@prisma/client';

// Ensure DATABASE_URL is a valid PostgreSQL URL.
// If Render's environment panel is missing/misconfigured, fall back to the correct Supabase URL.
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
  process.env.DATABASE_URL =
    'postgresql://postgres.atemdjiekexfuqjrxalq:Omidihoney.10@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
}

const prisma = new PrismaClient();

export default prisma;

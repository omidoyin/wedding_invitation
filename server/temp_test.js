import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to database...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "Invite" ADD COLUMN IF NOT EXISTS "isSent" BOOLEAN NOT NULL DEFAULT false;`);
    console.log('Successfully added column isSent if not exists!');
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

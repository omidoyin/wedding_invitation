-- Add missing columns to Attendee table
ALTER TABLE "Attendee" ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;
ALTER TABLE "Attendee" ADD COLUMN IF NOT EXISTS "attendeeToken" TEXT;
ALTER TABLE "Attendee" ADD COLUMN IF NOT EXISTS "registeredBy" TEXT;
ALTER TABLE "Attendee" ADD COLUMN IF NOT EXISTS "checkedIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Attendee" ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP(3);
ALTER TABLE "Attendee" ADD COLUMN IF NOT EXISTS "checkInPhoto" TEXT;
ALTER TABLE "Attendee" ADD COLUMN IF NOT EXISTS "checkedOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Attendee" ADD COLUMN IF NOT EXISTS "checkedOutAt" TIMESTAMP(3);
ALTER TABLE "Attendee" ADD COLUMN IF NOT EXISTS "seatNumber" TEXT;

-- Back-fill serialNumber and attendeeToken with unique placeholder values so we can add unique constraints
UPDATE "Attendee" SET "serialNumber" = 'ATT-' || "id"::TEXT WHERE "serialNumber" IS NULL;
UPDATE "Attendee" SET "attendeeToken" = 'TOK-' || "id"::TEXT || '-' || extract(epoch from now())::TEXT WHERE "attendeeToken" IS NULL;

-- Now make them NOT NULL
ALTER TABLE "Attendee" ALTER COLUMN "serialNumber" SET NOT NULL;
ALTER TABLE "Attendee" ALTER COLUMN "attendeeToken" SET NOT NULL;

-- Add unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Attendee_serialNumber_key" ON "Attendee"("serialNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Attendee_attendeeToken_key" ON "Attendee"("attendeeToken");

-- Add missing columns to RSVP table
ALTER TABLE "RSVP" ADD COLUMN IF NOT EXISTS "checkedOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RSVP" ADD COLUMN IF NOT EXISTS "checkedOutAt" TIMESTAMP(3);

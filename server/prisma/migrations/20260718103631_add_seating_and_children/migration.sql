-- AlterTable
ALTER TABLE "Attendee" ADD COLUMN     "tableId" INTEGER;

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "seatingPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "side" TEXT NOT NULL DEFAULT 'Neutral';

-- AlterTable
ALTER TABLE "RSVP" ADD COLUMN     "anyChildren" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "childrenCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Table" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "side" TEXT NOT NULL DEFAULT 'Neutral',
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Table_name_key" ON "Table"("name");

-- AddForeignKey
ALTER TABLE "Attendee" ADD CONSTRAINT "Attendee_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

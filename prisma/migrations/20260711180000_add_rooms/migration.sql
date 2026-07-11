-- AlterTable: drop old Patient→Ward FK before introducing Room
ALTER TABLE "Patient" DROP CONSTRAINT IF EXISTS "Patient_wardId_fkey";

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- Create default room per existing ward and re-home patients
INSERT INTO "Room" ("id", "wardId", "number", "createdAt")
SELECT 'room_' || w."id", w."id", '1', CURRENT_TIMESTAMP
FROM "Ward" w;

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "roomId" TEXT;

UPDATE "Patient" p
SET "roomId" = 'room_' || p."wardId"
WHERE p."roomId" IS NULL AND p."wardId" IS NOT NULL;

ALTER TABLE "Patient" ALTER COLUMN "roomId" SET NOT NULL;

ALTER TABLE "Patient" DROP COLUMN IF EXISTS "wardId";

CREATE UNIQUE INDEX "Room_wardId_number_key" ON "Room"("wardId", "number");

ALTER TABLE "Room" ADD CONSTRAINT "Room_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Patient" ADD CONSTRAINT "Patient_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

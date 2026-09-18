ALTER TABLE "Ward" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "Ward" ADD COLUMN IF NOT EXISTS "bedCapacity" INTEGER;

ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'EMPTY';

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "admittingDoctorId" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "assignedNurseId" TEXT;

ALTER TABLE "Reading" ADD COLUMN IF NOT EXISTS "respiratoryRate" INTEGER;

ALTER TABLE "HospitalThresholds" ADD COLUMN IF NOT EXISTS "rrLow" INTEGER NOT NULL DEFAULT 8;
ALTER TABLE "HospitalThresholds" ADD COLUMN IF NOT EXISTS "rrHigh" INTEGER NOT NULL DEFAULT 25;

ALTER TABLE "PatientThresholdOverride" ADD COLUMN IF NOT EXISTS "rrLow" INTEGER;
ALTER TABLE "PatientThresholdOverride" ADD COLUMN IF NOT EXISTS "rrHigh" INTEGER;

CREATE TABLE IF NOT EXISTS "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Patient" ADD CONSTRAINT "Patient_admittingDoctorId_fkey"
    FOREIGN KEY ("admittingDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Patient" ADD CONSTRAINT "Patient_assignedNurseId_fkey"
    FOREIGN KEY ("assignedNurseId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill room status from active patients
UPDATE "Room" r
SET "status" = 'OCCUPIED'
WHERE EXISTS (
  SELECT 1 FROM "Patient" p
  WHERE p."roomId" = r."id" AND p."status" = 'ACTIVE'
) AND r."status" = 'EMPTY';

-- Patient demographics + discharge
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "age" INTEGER;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "sex" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "admissionReason" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "dischargedAt" TIMESTAMP(3);

-- Device bed mapping; patient optional
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "roomId" TEXT;
ALTER TABLE "Device" ALTER COLUMN "patientId" DROP NOT NULL;

-- Backfill roomId from patient
UPDATE "Device" d
SET "roomId" = p."roomId"
FROM "Patient" p
WHERE d."patientId" = p."id" AND d."roomId" IS NULL;

-- Alert acknowledge / resolve
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "value" DOUBLE PRECISION;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3);
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "acknowledgedById" TEXT;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "Alert" ALTER COLUMN "readingId" DROP NOT NULL;

-- User directory fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "staffId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- FKs / indexes (idempotent-ish)
DO $$ BEGIN
  ALTER TABLE "Device" ADD CONSTRAINT "Device_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Alert" ADD CONSTRAINT "Alert_acknowledgedById_fkey"
    FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Alert_status_createdAt_idx" ON "Alert"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Alert_deviceId_alertType_status_idx" ON "Alert"("deviceId", "alertType", "status");

CREATE TABLE IF NOT EXISTS "HospitalThresholds" (
    "id" TEXT NOT NULL,
    "tempLow" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "tempHigh" DOUBLE PRECISION NOT NULL DEFAULT 38.5,
    "hrLow" INTEGER NOT NULL DEFAULT 50,
    "hrHigh" INTEGER NOT NULL DEFAULT 120,
    "spo2Low" INTEGER NOT NULL DEFAULT 92,
    "sysLow" INTEGER NOT NULL DEFAULT 90,
    "sysHigh" INTEGER NOT NULL DEFAULT 180,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "HospitalThresholds_pkey" PRIMARY KEY ("id")
);

INSERT INTO "HospitalThresholds" ("id", "updatedAt")
VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "PatientThresholdOverride" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tempLow" DOUBLE PRECISION,
    "tempHigh" DOUBLE PRECISION,
    "hrLow" INTEGER,
    "hrHigh" INTEGER,
    "spo2Low" INTEGER,
    "sysLow" INTEGER,
    "sysHigh" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PatientThresholdOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PatientThresholdOverride_patientId_key"
  ON "PatientThresholdOverride"("patientId");

DO $$ BEGIN
  ALTER TABLE "PatientThresholdOverride" ADD CONSTRAINT "PatientThresholdOverride_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

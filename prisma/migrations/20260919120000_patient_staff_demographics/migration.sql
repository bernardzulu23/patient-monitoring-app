-- AlterTable Patient: demographics + next of kin
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "nrc" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "residentialArea" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "nextOfKinFullName" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "nextOfKinResidentialArea" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "nextOfKinPhone" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "nextOfKinRelation" TEXT;

-- AlterTable User: ID document + forced password change + unique staffId
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nrcOrPassport" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "User_staffId_key" ON "User"("staffId");

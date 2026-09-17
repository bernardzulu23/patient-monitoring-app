-- AlterTable
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateTable
CREATE TABLE "LandingImage" (
    "id" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingImage_slot_idx" ON "LandingImage"("slot");

import { prisma } from "@/lib/prisma";

export {
  ALLOWED_MIME,
  isLandingSlot,
  LANDING_SLOTS,
  MAX_IMAGE_BYTES,
  publicImageUrl,
  type LandingSlot,
} from "@/lib/landing-shared";

export async function listLandingImagesMeta() {
  return prisma.landingImage.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slot: true,
      fileName: true,
      mimeType: true,
      createdAt: true,
      uploadedById: true,
    },
  });
}

export async function getHeroImageMeta() {
  return prisma.landingImage.findFirst({
    where: { slot: "HERO" },
    orderBy: { createdAt: "desc" },
    select: { id: true, mimeType: true, fileName: true },
  });
}

export async function getGalleryImageMetas(limit = 6) {
  return prisma.landingImage.findMany({
    where: { slot: "GALLERY" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, mimeType: true, fileName: true },
  });
}

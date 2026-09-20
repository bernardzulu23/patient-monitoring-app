import { prisma } from "@/lib/prisma";

export {
  ALLOWED_MIME,
  isLandingSlot,
  LANDING_SLOTS,
  MAX_IMAGE_BYTES,
  publicImageUrl,
  type LandingSlot,
} from "@/lib/landing-shared";

/** Don't console.error(Error) — Next.js surfaces that as a red server overlay. */
function logLandingDbError(op: string, error: unknown) {
  const message =
    error instanceof Error
      ? error.message.replace(/\s+/g, " ").slice(0, 180)
      : String(error);
  console.warn(`[landing] ${op}: ${message}`);
}

/** Cap wait so a dead Neon pool cannot hold the public homepage for 10–30s. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        logLandingDbError("query", error);
        resolve(fallback);
      });
  });
}

const LANDING_DB_MS = 4_000;

export async function listLandingImagesMeta() {
  return withTimeout(
    prisma.landingImage.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slot: true,
        fileName: true,
        mimeType: true,
        createdAt: true,
        uploadedById: true,
      },
    }),
    LANDING_DB_MS,
    [],
  );
}

export async function getHeroImageMeta() {
  return withTimeout(
    prisma.landingImage.findFirst({
      where: { slot: "HERO" },
      orderBy: { createdAt: "desc" },
      select: { id: true, mimeType: true, fileName: true },
    }),
    LANDING_DB_MS,
    null,
  );
}

export async function getGalleryImageMetas(limit = 6) {
  return withTimeout(
    prisma.landingImage.findMany({
      where: { slot: "GALLERY" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, mimeType: true, fileName: true },
    }),
    LANDING_DB_MS,
    [],
  );
}

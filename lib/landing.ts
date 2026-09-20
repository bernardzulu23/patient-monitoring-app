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

const LANDING_DB_MS = 4_000;

async function withTimeout<T>(
  work: () => Promise<T>,
  ms: number,
  fallback: T,
  op: string,
): Promise<T> {
  try {
    return await new Promise<T>((resolve) => {
      const timer = setTimeout(() => resolve(fallback), ms);
      work()
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          logLandingDbError(op, error);
          resolve(fallback);
        });
    });
  } catch (error) {
    logLandingDbError(op, error);
    return fallback;
  }
}

/** Dynamic import so a Prisma/Neon init failure cannot crash public pages at module load. */
async function db() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

export async function listLandingImagesMeta() {
  return withTimeout(
    async () => {
      const prisma = await db();
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
    },
    LANDING_DB_MS,
    [],
    "listLandingImagesMeta",
  );
}

export async function getHeroImageMeta() {
  return withTimeout(
    async () => {
      const prisma = await db();
      return prisma.landingImage.findFirst({
        where: { slot: "HERO" },
        orderBy: { createdAt: "desc" },
        select: { id: true, mimeType: true, fileName: true },
      });
    },
    LANDING_DB_MS,
    null,
    "getHeroImageMeta",
  );
}

export async function getGalleryImageMetas(limit = 6) {
  return withTimeout(
    async () => {
      const prisma = await db();
      return prisma.landingImage.findMany({
        where: { slot: "GALLERY" },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, mimeType: true, fileName: true },
      });
    },
    LANDING_DB_MS,
    [],
    "getGalleryImageMetas",
  );
}

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function trimUrl(value: string | undefined) {
  return value?.trim() || undefined;
}

/**
 * Local/dev: use direct TCP (DATABASE_URL_UNPOOLED) — Neon WebSocket adapter often
 * fails on Windows networks ("non-101 status code").
 * Production/Vercel: use @prisma/adapter-neon with pooled DATABASE_URL.
 */
function createPrismaClient() {
  const pooled = trimUrl(process.env.DATABASE_URL);
  const unpooled = trimUrl(process.env.DATABASE_URL_UNPOOLED);
  const useNeonAdapter =
    process.env.USE_NEON_ADAPTER === "1" ||
    process.env.VERCEL === "1" ||
    process.env.NODE_ENV === "production";

  if (useNeonAdapter) {
    if (!pooled) throw new Error("DATABASE_URL is not set");
    const adapter = new PrismaNeon({ connectionString: pooled });
    return new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  const url = unpooled || pooled;
  if (!url) {
    throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is not set");
  }

  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

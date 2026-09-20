import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

/** Bump when pool/URL strategy changes so Turbopack HMR drops a stale singleton. */
const PRISMA_SINGLETON_REV = 3;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRev: number | undefined;
};

function trimUrl(value: string | undefined) {
  return value?.trim() || undefined;
}

/**
 * Append query params without parsing the full URL (passwords often break
 * WHATWG URL parsing and cause "Authentication failed").
 */
function withDbParams(url: string, params: Record<string, string>) {
  let next = url;
  for (const [key, value] of Object.entries(params)) {
    const re = new RegExp(`([?&])${key}=[^&]*`);
    if (re.test(next)) {
      next = next.replace(re, `$1${key}=${value}`);
    } else {
      next += next.includes("?") ? `&${key}=${value}` : `?${key}=${value}`;
    }
  }
  return next;
}

/**
 * Local/dev: direct TCP (DATABASE_URL_UNPOOLED) — Neon WebSocket adapter often
 * fails on Windows networks ("non-101 status code").
 * Production/Vercel: @prisma/adapter-neon with pooled DATABASE_URL.
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

  // Prefer direct Neon URL locally. Keep pool small — Turbopack HMR can spawn
  // multiple clients; a large pool + cold Neon compute causes pool timeouts.
  const base = unpooled || pooled;
  if (!base) {
    throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is not set");
  }

  const url = withDbParams(base, {
    connect_timeout: "15",
    pool_timeout: "20",
    connection_limit: "3",
  });

  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrisma() {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaRev === PRISMA_SINGLETON_REV
  ) {
    return globalForPrisma.prisma;
  }

  const previous = globalForPrisma.prisma;
  if (previous) {
    void previous.$disconnect().catch(() => undefined);
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaRev = PRISMA_SINGLETON_REV;
  }
  return client;
}

export const prisma = getPrisma();

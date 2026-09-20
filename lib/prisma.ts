import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

/** Bump when pool/URL strategy changes so HMR / warm isolates drop a stale client. */
const PRISMA_SINGLETON_REV = 4;

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
 * Local/dev: direct TCP (DATABASE_URL_UNPOOLED).
 * Production/Vercel: @prisma/adapter-neon over WebSockets (needs `ws` on Node).
 */
function createPrismaClient() {
  const pooled = trimUrl(process.env.DATABASE_URL);
  const unpooled = trimUrl(process.env.DATABASE_URL_UNPOOLED);
  const useNeonAdapter =
    process.env.USE_NEON_ADAPTER === "1" ||
    process.env.VERCEL === "1" ||
    process.env.NODE_ENV === "production";

  if (useNeonAdapter) {
    if (!pooled) {
      throw new Error("DATABASE_URL is not set");
    }
    // Node (Vercel serverless) has no WebSocket global — required by Neon driver.
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon({ connectionString: pooled });
    return new PrismaClient({
      adapter,
      log: ["error"],
    });
  }

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

function getPrisma(): PrismaClient {
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
  // Always cache — critical on Vercel warm isolates to avoid connection storms.
  globalForPrisma.prisma = client;
  globalForPrisma.prismaRev = PRISMA_SINGLETON_REV;
  return client;
}

/**
 * Lazy proxy so importing this module never throws during build/SSR init.
 * Failures surface on first query (public pages can catch / time out).
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

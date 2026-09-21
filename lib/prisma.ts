import { PrismaClient } from "@prisma/client";

/** Bump when pool/URL strategy changes so HMR / warm isolates drop a stale client. */
const PRISMA_SINGLETON_REV = 5;

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
 * Prefer Neon pooled TCP on Vercel Node runtimes (API routes use nodejs).
 * WebSocket adapter is optional via USE_NEON_ADAPTER=1 — it often fails when
 * credentials rotate or the serverless WS path is flaky.
 */
function createPrismaClient() {
  const pooled = trimUrl(process.env.DATABASE_URL);
  const unpooled = trimUrl(process.env.DATABASE_URL_UNPOOLED);
  const forceAdapter = process.env.USE_NEON_ADAPTER === "1";

  if (forceAdapter) {
    // Lazy-load so default path does not require ws at module eval time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaNeon } = require("@prisma/adapter-neon") as typeof import("@prisma/adapter-neon");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { neonConfig } = require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ws = require("ws") as typeof import("ws");
    if (!pooled) throw new Error("DATABASE_URL is not set");
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon({ connectionString: pooled });
    return new PrismaClient({ adapter, log: ["error"] });
  }

  const onVercel = process.env.VERCEL === "1";
  const base = onVercel ? pooled || unpooled : unpooled || pooled;
  if (!base) {
    throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is not set");
  }

  const url = withDbParams(
    base,
    onVercel
      ? {
          // Neon pooler + Prisma: required for serverless TCP
          pgbouncer: "true",
          connect_timeout: "15",
          pool_timeout: "20",
          connection_limit: "1",
          sslmode: "require",
        }
      : {
          connect_timeout: "15",
          pool_timeout: "20",
          connection_limit: "3",
        },
  );

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

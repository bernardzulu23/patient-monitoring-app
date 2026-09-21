import { PrismaClient } from "@prisma/client";

/** Bump when pool/URL strategy changes so HMR / warm isolates drop a stale client. */
const PRISMA_SINGLETON_REV = 6;

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
 * Vercel Node runtimes: Neon pooled TCP with pgbouncer.
 * Local/dev: prefer direct (unpooled) URL.
 */
function createPrismaClient() {
  const pooled = trimUrl(process.env.DATABASE_URL);
  const unpooled = trimUrl(process.env.DATABASE_URL_UNPOOLED);
  const onVercel = process.env.VERCEL === "1";

  const base = onVercel ? pooled || unpooled : unpooled || pooled;
  if (!base) {
    throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is not set");
  }

  const url = withDbParams(
    base,
    onVercel
      ? {
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

/**
 * Run `prisma migrate deploy` during Vercel build, but do not fail the whole
 * deploy on transient Neon connectivity / auth errors — the previous
 * deployment would keep serving a broken runtime otherwise.
 */
const { spawnSync } = require("child_process");

const result = spawnSync(
  "npx",
  ["prisma", "migrate", "deploy"],
  { encoding: "utf8", shell: true, env: process.env },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status === 0) {
  process.exit(0);
}

const output = `${result.stdout || ""}\n${result.stderr || ""}`;
const softFail =
  /P1001|P1000|P1010|Can't reach database|Authentication failed|timed out/i.test(
    output,
  );

if (softFail) {
  console.warn(
    "[migrate-safe] prisma migrate deploy failed (DB unreachable/auth). Continuing build so the app can still deploy. Re-run migrations once DATABASE_URL_UNPOOLED is valid.",
  );
  process.exit(0);
}

process.exit(result.status ?? 1);

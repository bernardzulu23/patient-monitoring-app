/**
 * Live security regression checks against a running instance seeded by prisma/seed.ts.
 * Usage: BASE_URL=http://localhost:3100 SEED_PASSWORD=... node scripts/live-security-check.mjs
 * Run against local/staging only — it performs logins, failed logins and a logout.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const PASSWORD = process.env.SEED_PASSWORD;
if (!PASSWORD) {
  console.error("Set SEED_PASSWORD to the password printed by the seed.");
  process.exit(2);
}

let failed = 0;
function check(id, name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${id} ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed += 1;
}

const ROTATED_PASSWORD = `${PASSWORD}-Rotated`;

async function rawLogin(email, password) {
  const res = await fetch(`${BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";")[0];
  const body = await res.clone().json().catch(() => ({}));
  return { res, cookie, setCookie, body };
}

/**
 * Seeded accounts start on a temporary password. The first run proves the API
 * refuses that session (A12), then rotates it; later runs use the rotated password.
 */
async function login(email) {
  let session = await rawLogin(email, PASSWORD);
  if (session.res.status === 401) session = await rawLogin(email, ROTATED_PASSWORD);
  if (session.res.status !== 200 || !session.body.mustChangePassword) return session;

  const blocked = await get("/api/dashboard/wards", session.cookie);
  check("A12", `${email} temp-password session refused by API`, [401, 403].includes(blocked.status), `status ${blocked.status}`);
  const page = await get("/dashboard/beds", session.cookie);
  check("A12", `${email} temp-password session redirected to settings`, (page.headers.get("location") ?? "").includes("/dashboard/settings"), `status ${page.status}`);

  const rotate = await send("/api/settings/password", "POST", session.cookie, {
    currentPassword: PASSWORD,
    newPassword: ROTATED_PASSWORD,
  });
  check("A12", `${email} can rotate temp password`, rotate.status === 200, `status ${rotate.status}`);
  const setCookie = rotate.headers.get("set-cookie") ?? "";
  return { res: rotate, cookie: setCookie.split(";")[0], setCookie, body: {} };
}

function get(path, cookie) {
  return fetch(`${BASE}${path}`, { headers: cookie ? { Cookie: cookie } : {}, redirect: "manual" });
}

function send(path, method, cookie, body, extra = {}) {
  return fetch(`${BASE}${path}`, {
    method,
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE,
      ...(cookie ? { Cookie: cookie } : {}),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// --- A6 cookie flags + A10 JWT claims ---------------------------------------
const admin = await login("admin@hospital.test");
check("A6", "login succeeds for seeded admin", admin.res.status === 200, `status ${admin.res.status}`);
const sc = admin.setCookie.toLowerCase();
check("A6", "cookie HttpOnly", sc.includes("httponly"));
check("A6", "cookie Secure (production)", sc.includes("secure"));
check("A6", "cookie SameSite=Lax", sc.includes("samesite=lax"));
check("A6", "cookie uses __Host- prefix", admin.cookie.startsWith("__Host-session="));
const payload = JSON.parse(
  Buffer.from(admin.cookie.split("=")[1].split(".")[1], "base64url").toString(),
);
check("A10", "JWT has iss/aud/exp/jti", Boolean(payload.iss && payload.aud && payload.exp && payload.jti));
check("A10", "JWT lifetime <= 8h", payload.exp - payload.iat <= 8 * 3600);

// --- Z1 unauthenticated access ---------------------------------------------
const protectedGets = [
  "/api/dashboard/wards",
  "/api/dashboard/beds",
  "/api/dashboard/alerts",
  "/api/dashboard/siem",
  "/api/staff",
  "/api/admin/devices",
  "/api/admin/messages",
  "/api/admin/thresholds",
  "/api/landing/images",
];
for (const path of protectedGets) {
  const res = await get(path);
  check("Z1", `GET ${path} unauthenticated`, res.status === 401 || res.status === 403, `status ${res.status}`);
}
const protectedWrites = [
  ["/api/patients", "POST"],
  ["/api/wards", "POST"],
  ["/api/staff", "POST"],
  ["/api/admin/devices", "POST"],
  ["/api/admin/thresholds", "PUT"],
];
for (const [path, method] of protectedWrites) {
  const res = await send(path, method, null, {});
  check("Z1", `${method} ${path} unauthenticated`, [401, 403, 405].includes(res.status), `status ${res.status}`);
}
const dash = await get("/dashboard");
check("Z1", "/dashboard redirects to /login without session", dash.status === 307 && (dash.headers.get("location") ?? "").includes("/login"));

// --- A10 forged token ------------------------------------------------------
const forgedNone = `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${admin.cookie.split("=")[1].split(".")[1]}.`;
const forgedRes = await get("/api/dashboard/wards", `__Host-session=${forgedNone}`);
check("A10", "alg=none token rejected", forgedRes.status === 401 || forgedRes.status === 403, `status ${forgedRes.status}`);

// --- Z2 cross-ward IDOR ----------------------------------------------------
const beds = await (await get("/api/dashboard/beds", admin.cookie)).json();
const allBeds = beds.beds ?? beds;
const icuB = allBeds.find((b) => b.wardName === "ICU-B" && b.patientId);
const nurseA = await login("nurse.icu.a@hospital.test");
check("Z2", "nurse A can sign in", nurseA.res.status === 200);
if (icuB) {
  const detail = await get(`/api/dashboard/patients/${icuB.patientId}`, nurseA.cookie);
  check("Z2", "nurse A cannot read ICU-B patient", [403, 404].includes(detail.status), `status ${detail.status}`);
  const csv = await get(`/api/patients/${icuB.patientId}/export.csv`, nurseA.cookie);
  check("Z2", "nurse A cannot export ICU-B patient CSV", [403, 404].includes(csv.status), `status ${csv.status}`);
  const patch = await send(`/api/patients/${icuB.patientId}`, "PATCH", nurseA.cookie, { fullName: "Hacked" });
  check("Z2", "nurse A cannot edit ICU-B patient", [403, 404].includes(patch.status), `status ${patch.status}`);
  const discharge = await send(`/api/patients/${icuB.patientId}/discharge`, "POST", nurseA.cookie, {});
  check("Z2", "nurse A cannot discharge ICU-B patient", [403, 404].includes(discharge.status), `status ${discharge.status}`);
} else {
  check("Z2", "found an ICU-B patient to test against", false);
}
const nurseBeds = await (await get("/api/dashboard/beds", nurseA.cookie)).json();
const nurseWardNames = new Set((nurseBeds.beds ?? nurseBeds).map((b) => b.wardName));
check("Z2", "nurse A bed list only contains ICU-A", nurseWardNames.size === 1 && nurseWardNames.has("ICU-A"), [...nurseWardNames].join(","));

// --- Z3 / Z4 vertical privilege + mass assignment ---------------------------
const staffCreate = await send("/api/staff", "POST", nurseA.cookie, {
  email: "evil@x.test", role: "doctor", fullName: "Evil", nrcOrPassport: "X",
});
check("Z3", "nurse cannot create staff", staffCreate.status === 403, `status ${staffCreate.status}`);
const wardCreate = await send("/api/wards", "POST", nurseA.cookie, { name: "Evil ward" });
check("Z3", "nurse cannot create wards", wardCreate.status === 403, `status ${wardCreate.status}`);
const roleViaAdmin = await send("/api/staff", "POST", admin.cookie, {
  email: `mass-${Date.now()}@x.test`, role: "admin", fullName: "Mass", nrcOrPassport: "X", wardId: null,
});
check("Z4", "staff API refuses role=admin", roleViaAdmin.status === 400, `status ${roleViaAdmin.status}`);
const doctor = await login("doctor@hospital.test");
if (icuB) {
  const docPatch = await send(`/api/patients/${icuB.patientId}`, "PATCH", doctor.cookie, { fullName: "X" });
  check("Z3", "doctor cannot edit patients", docPatch.status === 403, `status ${docPatch.status}`);
}

// --- C1 CSRF ---------------------------------------------------------------
const csrf = await send("/api/contact", "POST", null, { name: "a", institution: "b", message: "c" }, { Origin: "https://evil.example" });
check("C1", "cross-site POST rejected", csrf.status === 403, `status ${csrf.status}`);
const csrfFetch = await send("/api/patients", "POST", nurseA.cookie, {}, { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" });
check("C1", "cross-site authenticated mutation rejected", csrfFetch.status === 403, `status ${csrfFetch.status}`);

// --- I11 body limit --------------------------------------------------------
const big = await send("/api/contact", "POST", null, { name: "a", institution: "b", message: "x".repeat(300_000) });
check("I11", "oversize body rejected", big.status === 413, `status ${big.status}`);

// --- D8 cache headers ------------------------------------------------------
const wardsRes = await get("/api/dashboard/wards", admin.cookie);
check("D8", "authenticated API is no-store", (wardsRes.headers.get("cache-control") ?? "").includes("no-store"));
check("H8", "no X-Powered-By header", !wardsRes.headers.has("x-powered-by"));

// --- A8 logout invalidates server-side -------------------------------------
const before = await get("/api/dashboard/wards", nurseA.cookie);
await send("/api/logout", "POST", nurseA.cookie, {});
const after = await get("/api/dashboard/wards", nurseA.cookie);
check("A8", "token works before logout", before.status === 200, `status ${before.status}`);
check("A8", "same token rejected after logout", after.status === 401 || after.status === 403, `status ${after.status}`);

console.log(failed === 0 ? "\nAll live checks passed." : `\n${failed} live check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);

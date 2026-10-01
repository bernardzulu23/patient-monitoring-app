# Patient Monitor — rural hospital deployment

Offline-first PWA for ward monitoring. Primary deploy is a **hospital LAN PC** with local Postgres and an optional SIM800 modem for vitals SMS fallback.

## Quick start (on-prem Windows / Linux)

### 1. Database

```bash
docker compose up -d db
```

Without Docker: install PostgreSQL 16, create DB `patient_monitor` and user `pm`, then set the same URLs in `.env`.

### 2. Environment

```bash
cp .env.example .env
# Edit SESSION_SECRET and DB password if you changed docker-compose.yml
```

### 3. Migrate, seed, run on LAN

```bash
npm install
npm run db:migrate:deploy
npm run db:seed
npm run build
npm run start:behind-proxy   # binds 127.0.0.1:3000 only
```

> Note: production build uses webpack (`next build --webpack`) so Serwist can inject the service worker. Dev also uses `--webpack` for the same reason.

### 3b. HTTPS front end (required)

Session cookies are `Secure` in production, so sign-in only works over HTTPS. Run [Caddy](https://caddyserver.com/download) on the same PC:

```bash
# .env: TRUST_PROXY=1
SITE_ADDRESS=192.168.1.20 caddy run --config deploy/Caddyfile --adapter caddyfile
```

Caddy redirects HTTP → HTTPS and issues a certificate from its local CA (`tls internal`). Install Caddy's root certificate on each ward phone/tablet once (`caddy trust` on the PC; copy `root.crt` from Caddy's data dir to devices).

Staff open `https://<hospital-pc-ip>` on the ward Wi‑Fi. Do not use `npm run start:lan` in production — it exposes plain HTTP on `0.0.0.0:3000` and bypasses TLS.

Allow only TCP 80/443 inbound on the hospital PC firewall; keep 3000 and 5432 closed to the LAN.

Demo logins — the seed prints a random one-time password (or uses `SEED_PASSWORD`); every account must change it at first sign-in. The seed refuses to run when `NODE_ENV=production`.

- `admin@hospital.test`
- `doctor@hospital.test`
- `nurse.icu.a@hospital.test` (and other ward nurses) — use a **nurse** account to see **Register patient**

### 4. SIM800 gateway (same PC)

```bash
cd gateway
npm install
# set SIM800_PORT=COM3 (Windows) or /dev/ttyUSB0 (Linux)
npm start
```

See [gateway/README.md](gateway/README.md).

### 5. Install as PWA

On a staff phone/tablet on hospital Wi‑Fi:

1. Open the HTTPS LAN URL from step 3b (service workers and PWA install require HTTPS).
2. Browser menu → **Install app** / **Add to Home Screen**.
3. Dashboard shell and recent API responses stay available if Wi‑Fi drops briefly; admits queue offline and sync when back on LAN.

## Cloud demo (Vercel + Neon)

Keep Neon pooled/unpooled URLs in `.env` / Vercel env. Deploy as usual. Cloud is for demos; rural sites should use on-prem above.

## Architecture

- HTTPS vitals: `POST /api/readings` with device `x-api-key`
- SMS vitals: modem → gateway → `POST /api/ingest/sms`
- Nurses admit patients for their ward; doctors are read-only for patient CRUD

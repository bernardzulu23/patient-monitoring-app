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
npm run start:lan
```

> Note: production build uses webpack (`next build --webpack`) so Serwist can inject the service worker. Dev also uses `--webpack` for the same reason.

Staff open `http://<hospital-pc-ip>:3000` on the ward Wi‑Fi.

Demo logins (password `changeme123`):

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

1. Open the LAN URL (HTTPS recommended for install — use [mkcert](https://github.com/FiloSottile/mkcert) for a local cert, or Chrome “Install app” on `localhost`).
2. Browser menu → **Install app** / **Add to Home Screen**.
3. Dashboard shell and recent API responses stay available if Wi‑Fi drops briefly; admits queue offline and sync when back on LAN.

## Cloud demo (Vercel + Neon)

Keep Neon pooled/unpooled URLs in `.env` / Vercel env. Deploy as usual. Cloud is for demos; rural sites should use on-prem above.

## Architecture

- HTTPS vitals: `POST /api/readings` with device `x-api-key`
- SMS vitals: modem → gateway → `POST /api/ingest/sms`
- Nurses admit patients for their ward; doctors are read-only for patient CRUD

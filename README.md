# Patient Monitoring System

Rural-hospital vital-signs monitoring (Next.js + Prisma + PostgreSQL).

**On-prem / offline-first setup:** see [DEPLOY.md](DEPLOY.md).

## Development

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

LAN production bind:

```bash
npm run build
npm run start:lan
```

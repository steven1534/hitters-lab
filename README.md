# Coach Steve's Hitters Lab

Player-development web app for Coach Steve's baseball training business.
Live at [hitters-lab.onrender.com](https://hitters-lab.onrender.com).

## What this app does

- **Public drill library** — 200+ professional baseball drills for hitting,
  organized by category, skill level, and pathway. SEO entry point.
- **Athlete portal** — athletes see the drills their coach has assigned them,
  mark progress, and receive feedback.
- **Coach dashboard** — coaches assign drills, leave feedback on submissions,
  manage their athlete roster, and track Blast Motion metrics.
- **Player reports** — PDF-exportable progress reports coaches deliver to
  athletes and their families.
- **Blast Motion integration** — upload and analyze sensor data from Blast
  swing trackers.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Wouter + Tailwind v4 |
| API | tRPC v11 + Express |
| DB | Postgres (Supabase) via Drizzle ORM |
| Auth | Custom bcrypt + JWT cookies |
| Hosting | Render (web service) |
| Email | Resend |
| Storage | S3 (video uploads) |
| Runtime | Node 22, pnpm 10 |

## Local development

```bash
pnpm install
cp .env.example .env  # fill in DATABASE_URL, APP_URL, JWT_SECRET, etc.
pnpm dev              # starts API on :3000 + Vite on :5173
```

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (API + client with HMR) |
| `pnpm build` | Production build (Vite client + esbuild server) |
| `pnpm start` | Run the built server (`node dist/index.js`) |
| `pnpm check` | TypeScript type check only |
| `pnpm test` | Vitest suite |
| `pnpm db:push` | Generate + apply Drizzle migrations |

### Running DB-backed tests

A small set of tests hit a live Postgres instance (marked with
`describe.skip` by default). To run them against a dev DB:

```bash
DATABASE_URL=postgres://... RUN_DB_TESTS=1 pnpm test
```

## Deployment

Render auto-deploys from `main` on push (config: [`render.yaml`](./render.yaml)).
A merge to `main` triggers build (`pnpm install && pnpm build`) and restart.

Required env vars in Render:
- `DATABASE_URL` — Supabase Postgres connection string
- `APP_URL` — e.g. `https://hitters-lab.onrender.com`
- `JWT_SECRET` — session signing key
- `RESEND_API_KEY` — transactional email
- AWS S3 credentials for video uploads

## Database

Two distinct schemas live in this Postgres instance:

- **`snake_case` tables** — the marketing site. **Do not touch from this app.**
- **`camelCase` tables** — the Hitters Lab app. Defined in [`drizzle/schema.ts`](./drizzle/schema.ts).

Touch only camelCase tables.

## Project layout

```
client/          # React app (Vite)
  src/
    pages/       # Top-level routes
    components/  # UI components
    lib/         # Client utilities
server/          # Express + tRPC backend
  _core/         # Entry point, auth, context
  routers.ts     # tRPC router root
drizzle/         # Schema + migrations
shared/          # Types/constants shared across client and server
```

## History

- **Phase 0** ([PR #8](https://github.com/steven1534/hitters-lab/pull/8)) — security hardening.
- **Phase 1** ([PR #9](https://github.com/steven1534/hitters-lab/pull/9)) — scope reduction.
  Cut 26,721 lines across 104 files: drill generator, drill comparison,
  athlete assessment, parent dashboard, impersonation, session notes,
  weekly progress reports, badges, activity feed, streaks, weekly challenges,
  quizzes, practice planner, video analysis, swing analyzer, drill page
  builder, Q&A, messaging, component showcase. What's left is the core
  coach-athlete loop: drills → assignments → feedback → Blast metrics →
  player reports.

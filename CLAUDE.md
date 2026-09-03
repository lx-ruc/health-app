# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A health & lifestyle tracking WeChat mini-program (小程序) that helps users identify and adjust habits that may contribute to chronic health issues. The app records daily habits (sleep, diet, exercise, work patterns), supports health metric check-ins (weight, blood pressure, etc.), and uses AI to analyze correlations between lifestyle and health indicators.

## Tech Stack

- **Frontend**: uni-app (Vue 3 + TypeScript + Pinia) — WeChat mini-program
- **Backend**: Node.js + Fastify + TypeScript (ESM, tsx)
- **Database**: SQLite (better-sqlite3, WAL mode) at `server/data/health.db`
- **AI**: DeepSeek (health analysis chat), SiliconFlow PaddleOCR-VL (report OCR)

## Development Commands

```bash
# Frontend (from client/)
npm install
npm run dev:mp-weixin      # Dev watcher → client/dist/dev/mp-weixin (open that dir in 微信开发者工具)
npm run build:mp-weixin    # Production build
npm run type-check         # vue-tsc --noEmit

# Backend (from server/)
npm install
npm run dev                # tsx watch, port 3000
npm run build              # tsc → dist/
npx tsc --noEmit           # Type check only
```

No test framework is configured in either package. DevTools HMR rebuild takes ~8s after editing client source; the compiled output under `client/dist/dev/mp-weixin/` is what actually runs (grep it to verify a change landed).

## Architecture

### Auth flow (end to end)

1. `App.vue` `onLaunch` → `doLogin()` (`client/src/api/index.ts`): `uni.login` gets a wx code → `POST /api/auth/login` → server returns `{ token }` (flat, JWT 7d) → stored via storage helpers.
2. Every request goes through the `request()` wrapper: auto-attaches `Authorization: Bearer`, and on **401** retries transparently — first `POST /api/auth/refresh`, then a fresh `doLogin()`, then replays the original request.
3. Server side has **no auth plugin** — each route file calls `verifyToken(req.headers.authorization)` exported from `routes/auth.ts`, returning an `openid` or null.
4. **Dev bypass**: when `NODE_ENV != production` and `WX_APPID`/`WX_SECRET` are unset, login skips `code2Session` and signs everyone in as the shared user `dev-local-openid` (so seeded demo data reappears — don't mistake it for a bug).

### Database (`server/src/db/init.ts`)

- Schema is created idempotently at boot (`initDb()`), decorated onto Fastify as `app.db`; route files access it as `(app as any).db`.
- **Adding a column to an existing table** requires a migration — `CREATE TABLE IF NOT EXISTS` won't touch it. Follow the existing pattern: check `PRAGMA table_info(...)`, then `ALTER TABLE ADD COLUMN` (see the `metric_configs.created_at` and `users.allergies` migrations). Note SQLite forbids non-constant defaults (`datetime('now')`) in ADD COLUMN.
- Users are keyed by `openid` (no numeric id). Multi-value fields (diseases, metric list) are stored as JSON strings in TEXT columns. `habits` is `UNIQUE(openid, date)` — one record per day, upserted.

### AI pipelines

- **Chat analysis** (`routes/analysis.ts` + `services/ai.ts`): assembles a context string from the user's profile (diseases/allergies/surgery history), metric config, recent habits, and metric records, then sends it as the system message to DeepSeek. All prompts live in `server/src/config/ai.ts` — edit prompts there, not in service code. Chat history persists in `chat_messages` (last 20 messages sent).
- **Report flow** (`routes/report.ts`): client uploads base64 image → SiliconFlow PaddleOCR-VL extracts text → DeepSeek analyzes abnormalities as JSON (`{"abnormal":[...]}`) → stored in `reports` table with the image.
- Both AI routes are rate-limited per user via the in-memory sliding window in `server/src/utils/rateLimiter.ts` (single-instance only).

### Frontend data flow & design system

- Pinia stores (`user`, `habit`, `metric`, `chat`) mirror the API resources. Edit pages (e.g. `metrics/manage.vue`, `profile/history.vue`) copy store state into a local `draft`, mutate the draft immutably, and submit once on save — follow that pattern.
- Design system 「袖珍化验单」: tokens are CSS variables on the `page` selector in `App.vue` (`--paper/--card/--ink/--moss/--amber/--cinnabar` + `--t1/t2/t3/--line`); shared classes `.num` (DIN Alternate, tabular-nums for all numerals), `.sheet`, `.press`, `.eyebrow`, `.btn-primary`, `.chip`. The signature element is the **参考区间带** (`.band`/`.band-zone`/`.band-dot`), driven by reference ranges in `client/src/utils/metrics.ts` (`RANGES` → `bandGeometry()`/`metricStatus()`). `--cinnabar` is reserved for abnormal readings only; no gradients.

## Environment Variables (server)

Copy `server/.env.example` → `server/.env` (gitignored). Keys are NOT in `requirement.md` anymore.

```bash
WX_APPID=             # Optional in dev: missing + non-production → dev login bypass
WX_SECRET=
JWT_SECRET=           # REQUIRED — server refuses to start without it
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=    # Optional, defaults to https://api.deepseek.com
SILICONFLOW_API_KEY=
CORS_ORIGINS=         # Optional allowlist; default allows localhost/127.0.0.1 origins
NODE_ENV=production   # Disables the dev login bypass
```

## Mini-Program Gotchas

- **`API_BASE` must use `127.0.0.1`, never `localhost`** (`utils/constants.ts`): newer DevTools resolves localhost to IPv6 `::1` with no IPv4 fallback, while the dev server binds IPv4 only → instant "Failed to fetch" and a blank home page.
- **Error objects log as `{}`** through the mini-program console bridge (message/stack are non-enumerable). `main.ts` installs a Vue errorHandler that prints `String(err)` — use that pattern when debugging.
- **Alias imports from `utils/metrics.ts`** (e.g. `hasReference as metricHasReference`): a same-named local computed shadows the import and causes infinite-recursion render crashes.
- Visual verification: the weapp-dev-mcp tools (`mp_ensureConnection` → `mp_navigate` → `mp_screenshot`) drive the simulator. Screenshots capture the page viewport only — native navbar/tabBar are not included.

## Project Management

OpenSpec is configured in `openspec/config.yaml`. Use `/opsx:propose` to create change proposals, `/opsx:apply` to implement.

## Git

Independent repo at `https://github.com/lx-ruc/health-app.git`.

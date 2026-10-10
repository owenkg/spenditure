# Architecture

## Overview

Spenditure is a single-user personal finance application built as a monorepo with a clear separation between a static SPA frontend and a stateful REST API backend.

```
Browser (PWA)
    │  HTTPS + httpOnly cookies
    ▼
GitHub Pages          Render.com (Node)
  /spenditure/   ◄──   /api/*
  (static SPA)         NestJS 10
                        │
                       SQLite
                    /var/data/prod.db
                    (Persistent Disk)
```

## Frontend

**Framework:** Remix v2 in SPA mode (`ssr: false`)  
**Reason:** GitHub Pages serves only static files. SPA mode builds to a pure `index.html` + JS/CSS bundle with no server-side rendering. React Router handles all client-side navigation.

**Base URL:** `/spenditure/` in production — both Vite's `base` config and Remix's `basename` are set so assets and routing align with the GitHub Pages sub-path.

**API client:** A thin wrapper in `apps/web/app/lib/api.ts` around `fetch` that:
- Prepends `VITE_API_URL` (baked at build time via CI env var)
- Sends `credentials: 'include'` on every request so httpOnly cookies are forwarded
- Unwraps the `{ data: T }` response envelope

**Offline support:** `vite-plugin-pwa` generates a service worker using Workbox. Static assets are precached; API calls use `NetworkFirst` with a 24-hour cache fallback.

## Backend

**Framework:** NestJS 10 with URI versioning (`/api/v1/...`)  
**Database:** Prisma 5 ORM over SQLite (`better-sqlite3`). SQLite was chosen because:
- Single-user app — no concurrent write contention
- Zero infrastructure cost on Render (Persistent Disk at $0.25/GB/mo)
- Prisma migrations keep the schema in version control

**Module structure:**

| Module | Responsibility |
|---|---|
| `AuthModule` | Setup, login, refresh, logout, `/me` |
| `AccountsModule` | CRUD for financial accounts + balance history |
| `TransactionsModule` | CRUD, pagination, summary, 7-day chart |
| `CategoriesModule` | Hierarchical categories (parent/child) |
| `BudgetsModule` | Period budgets with live spend computation |
| `RecurringModule` | Scheduled recurring transactions + CRUD |
| `ImportModule` | DFCU PDF + MTN MoMo EML file parsers |
| `ExportModule` | CSV and Excel export with streaming |
| `SettingsModule` | PIN change, profile update, data wipe |
| `HealthModule` | `GET /api/health` for Render health checks |

**Global providers (registered via `APP_GUARD` / `APP_INTERCEPTOR`):**
- `JwtAuthGuard` — protects all routes except those marked `@Public()`
- `ThrottlerGuard` — 100 req/min globally; auth endpoints are tighter at 5 req/min
- `TransformResponseInterceptor` — wraps all responses in `{ data: T }`

## Authentication Flow

```
First visit:
  GET /api/v1/auth/status → { isSetup: false }
  POST /api/v1/auth/setup { name, pin }
    → bcrypt(pin, 10) stored as pinHash
    → access_token (JWT, 15 min, httpOnly) set in cookie
    → refresh_token (opaque, 7 days, httpOnly) set in cookie
    → bcrypt(refreshToken) stored as refreshTokenHash on User

Subsequent visits:
  GET /api/v1/auth/status → { isSetup: true }
  POST /api/v1/auth/login { pin }
    → verify pin against pinHash
    → check loginAttempts (≥5 → lockedUntil for 15 min)
    → issue new access + refresh tokens, rotate refreshTokenHash

Token refresh (auto):
  POST /api/v1/auth/refresh { refreshToken }
    → verify refreshToken against stored hash (rotation — invalidates old)
    → issue new pair
```

Access tokens are short-lived (15 min). The frontend relies on cookie forwarding; the refresh endpoint is called automatically by the browser's next authenticated request after the access token expires.

## Recurring Transactions

A `@Cron(EVERY_DAY_AT_MIDNIGHT)` job in `RecurringService.processDue()`:

1. Fetches all `RecurringTransaction` records where `isActive = true` AND `nextDate ≤ now`
2. For each — catches up all missed periods (loop while `date ≤ now`), creating a real `Transaction` per period
3. Advances `nextDate` to the next future occurrence
4. If `endDate` is past, marks `isActive = false`

## Import Pipeline

**DFCU PDF** (`POST /api/v1/import/dfcu`):
- `pdf-parse` extracts raw text
- Regex splits into transaction rows
- SHA-256 of `(date + amount + description)` used as `externalRef` for deduplication
- Duplicate check: `upsert` behaviour — skip if `externalRef` already exists

**MTN MoMo EML** (`POST /api/v1/import/momo`):
- `mailparser` parses the `.eml` email file
- HTML table rows extracted via regex
- Transaction ID from the table used as `externalRef`
- Same deduplication logic

## Data Flow: Adding a Transaction

```
User fills form → POST /api/v1/transactions
  → ValidationPipe validates body (whitelist, transform)
  → JwtAuthGuard extracts userId from cookie JWT
  → TransactionsService.create()
      → prisma.transaction.create()
      → AccountsService.recalculateBalance()  (SUM aggregate, not incremental)
  → TransformResponseInterceptor wraps → { data: { id, amount, ... } }
  → 201 Created
```

Balance is always computed from `SUM(amount WHERE type=INCOME) - SUM(amount WHERE type=EXPENSE)` — never stored incrementally — to stay consistent after imports and deletes.

## Deployment Architecture

```
git push main
    │
    ▼
GitHub Actions (ci.yml)
  ├── lint-typecheck (all packages)
  ├── test (jest --passWithNoTests)
  ├── build (turbo build)
  └── deploy-pages (only on main push)
        └── pnpm --filter web build (NODE_ENV=production, VITE_API_URL=render URL)
            └── upload build/client/ → GitHub Pages

Auto-deploy on Render (push to main)
  └── build: pnpm install && pnpm run build
      start: npx prisma migrate deploy && node dist/main
```

`prisma migrate deploy` runs in the same process context as the app, so it writes to the Persistent Disk (`/var/data/prod.db`) before NestJS initialises.

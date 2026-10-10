# Development Guide

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20.x | See `.nvmrc` — use `nvm use` |
| pnpm | 12.x | `npm install -g pnpm` |
| Git | any | |

## Initial setup

```bash
git clone https://github.com/owenkg/spenditure.git
cd spenditure

# Install all workspace dependencies
pnpm install

# Generate Prisma client
pnpm --filter @spenditure/api db:generate

# Create and migrate the dev database
pnpm --filter @spenditure/api db:migrate
```

## Environment variables

Copy the example env file and fill in JWT secrets:

```bash
cp apps/api/.env.example apps/api/.env
```

`apps/api/.env`:
```env
DATABASE_URL=file:./dev.db
NODE_ENV=development
JWT_SECRET=dev-secret-at-least-32-chars-long-xxx
JWT_REFRESH_SECRET=dev-refresh-secret-at-least-32-chars-xx
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
PORT=3000
```

The web app reads `VITE_API_URL` from the environment. In dev it defaults to `http://localhost:3000` (the fallback in `apps/web/app/lib/api.ts`), so no `.env` file is needed for the frontend.

## Running locally

Open two terminals:

```bash
# Terminal 1 — API (http://localhost:3000)
pnpm --filter @spenditure/api dev

# Terminal 2 — Web (http://localhost:5173)
pnpm --filter @spenditure/web dev
```

Or run both with Turborepo (they share stdout):

```bash
pnpm dev
```

Open http://localhost:5173. On first visit you'll see the setup screen — enter a name and choose a PIN.

## Available scripts

All scripts can be run from the repo root with `pnpm <script>` (Turborepo fans out to all packages).

| Script | Description |
|---|---|
| `pnpm dev` | Start API + Web in watch mode |
| `pnpm build` | Production build of all packages |
| `pnpm lint` | ESLint across all TS/TSX files |
| `pnpm typecheck` | `tsc --noEmit` across all packages |
| `pnpm test` | Jest (API) + no-op (web) |
| `pnpm clean` | Remove all `dist/`, `build/`, `.turbo/` |

Package-level scripts (using `--filter`):

```bash
# API
pnpm --filter @spenditure/api db:generate     # prisma generate
pnpm --filter @spenditure/api db:migrate      # prisma migrate dev
pnpm --filter @spenditure/api db:studio       # Prisma Studio (GUI)
pnpm --filter @spenditure/api db:reset        # drop + recreate dev.db (destructive)
pnpm --filter @spenditure/api build           # compile to dist/

# Web
pnpm --filter @spenditure/web build           # Remix + Vite build to build/client/
pnpm --filter @spenditure/web dev             # Vite dev server
```

## Project structure

```
apps/
  api/
    prisma/
      schema.prisma         Data model
      migrations/           SQL migration files
    src/
      auth/                 Setup, login, refresh, JWT guards
      accounts/             Account CRUD + balance history
      transactions/         Transaction CRUD, summary, chart
      categories/           Category tree CRUD
      budgets/              Budget CRUD + spend computation
      recurring/            Recurring schedule CRUD + cron job
      import/               DFCU PDF + MoMo EML parsers
      export/               CSV + Excel export
      settings/             PIN change, profile, data wipe
      health/               Health check endpoint
      common/               Shared interceptors, pipes, guards
      prisma/               PrismaService + PrismaModule
      app.module.ts         Root module
      main.ts               Bootstrap (CORS, Swagger, helmet, validation)

  web/
    app/
      routes/               Remix file-based routes
        _index.tsx           Redirects to /dashboard or /auth/pin
        auth.pin.tsx         Setup + login screen
        dashboard.tsx        Balance, chart, budgets, recent txns
        transactions.tsx     Full transaction list + add sheet
        accounts.tsx         Account management
        recurring.tsx        Recurring schedule management
        settings.tsx         PIN change, profile, data wipe
        import.tsx           File upload for DFCU/MoMo
      components/
        BottomNav.tsx        Fixed bottom navigation bar
        AddTransactionSheet.tsx  Modal form for adding transactions
      lib/
        api.ts               Typed fetch wrapper
      root.tsx               HTML shell, Tailwind, error boundary
      tailwind.css           Tailwind entry point
    public/                  PWA icons, manifest
    vite.config.ts           Remix + PWA + base URL config

packages/
  utils/
    src/index.ts             formatCurrency(), etc.
```

## Adding a new API endpoint

1. If a new module: `nest g module <name>` inside `apps/api/src/`
2. Create `<name>.controller.ts`, `<name>.service.ts`, DTOs in `dto/`
3. Add `@UseGuards(JwtAuthGuard)` on the controller (or individual routes)
4. Import the module in `app.module.ts`
5. Run typecheck: `pnpm typecheck`

## Adding a new database field

1. Edit `apps/api/prisma/schema.prisma`
2. Run `pnpm --filter @spenditure/api db:migrate` — enter a migration name when prompted
3. Run `pnpm --filter @spenditure/api db:generate` to update the Prisma client types
4. Update any affected services / DTOs

## Code style

- **ESLint 9 flat config** at repo root (`eslint.config.mjs`) covers all `*.ts` / `*.tsx` files
- **No `any`** — `@typescript-eslint/no-explicit-any` is a warning; fix before pushing
- **No unused vars** — error; prefix intentionally unused params with `_`
- **No comments** unless the "why" is non-obvious (not "what")
- **No `Co-Authored-By`** in commit messages

## Testing

```bash
pnpm test
```

The API runs Jest with `--passWithNoTests` (no test files exist yet). When adding tests, place them next to the file being tested: `<name>.service.spec.ts`.

## Commit conventions

No enforced format, but follow these patterns used in this repo:

```
feat: add recurring transactions scheduler
fix: correct GitHub Pages build artifact path
chore: update dependencies
docs: add API reference
```

## CI checks

Every PR and push to `main`/`develop` runs:

1. **Lint & Typecheck** — ESLint + tsc across all packages
2. **Tests** — Jest
3. **Build** — `turbo build` (ensures production build succeeds)

The `deploy-pages` job only runs on push to `main` (not on PRs).

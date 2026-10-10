# Spenditure

A personal finance PWA built for Uganda — track income, expenses, mobile money, and bank transactions with import/export capabilities.

**Live app:** https://owenkg.github.io/spenditure/  
**API:** https://spenditure-api.onrender.com  
**API docs (Swagger):** https://spenditure-api.onrender.com/api/docs

---

## Features

- PIN-based authentication with account lockout (5 attempts → 15-minute lock)
- Multi-account tracking: DFCU Bank, MTN MoMo, Cash, Savings, Investment
- Full transaction CRUD with category tagging and notes
- Import DFCU Bank PDF statements and MTN MoMo EML email exports
- Export transactions to CSV or Excel
- Budget tracking with per-category spend vs. limit progress
- Recurring transactions with daily/weekly/monthly/yearly scheduling
- 7-day spending trend chart on the dashboard
- Offline-capable PWA with service worker caching
- Light and dark themes

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Remix v2 (SPA mode), React 18, TypeScript, Tailwind CSS, Vite |
| Backend | NestJS 10, Prisma 5, SQLite (`better-sqlite3`) |
| Auth | JWT (15 min access) + refresh tokens (7 days), httpOnly cookies |
| Scheduler | `@nestjs/schedule` — daily cron for recurring transactions |
| Hosting | GitHub Pages (web) + Render.com Starter (API) |
| CI/CD | GitHub Actions — lint → typecheck → test → build → deploy |
| Monorepo | pnpm workspaces + Turborepo |

## Repository Structure

```
spenditure/
├── apps/
│   ├── api/           NestJS backend
│   │   ├── prisma/    Schema + migrations
│   │   └── src/       Modules: auth, accounts, transactions, categories,
│   │                           budgets, recurring, import, export, settings
│   └── web/           Remix SPA frontend
│       └── app/
│           ├── routes/  Page routes
│           ├── components/
│           └── lib/     API client, utilities
├── packages/
│   └── utils/         Shared helpers (formatCurrency, etc.)
├── docs/              Full documentation
└── .github/workflows/ CI + Pages deploy
```

## Quick Start (local development)

```bash
# Prerequisites: Node 20+, pnpm 12+

git clone https://github.com/owenkg/spenditure.git
cd spenditure
pnpm install

# API — terminal 1
cp apps/api/.env.example apps/api/.env   # fill in JWT secrets
pnpm --filter @spenditure/api db:generate
pnpm --filter @spenditure/api db:migrate
pnpm --filter @spenditure/api dev

# Web — terminal 2
pnpm --filter @spenditure/web dev
```

Open http://localhost:5173 — the setup screen will prompt you to choose a PIN.

See [docs/development.md](docs/development.md) for the full developer guide.

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | System design, decisions, data flow |
| [API Reference](docs/api-reference.md) | All REST endpoints with request/response shapes |
| [Database Schema](docs/database-schema.md) | Models, fields, relationships, indexes |
| [Deployment](docs/deployment.md) | Render + GitHub Pages deployment guide |
| [Development](docs/development.md) | Local setup, scripts, conventions |
| [User Guide](docs/user-guide.md) | How to use the app |

Interactive API docs are served at `/api/docs` (Swagger UI) when the API is running.

## License

MIT — personal use project by George Kivumbi.

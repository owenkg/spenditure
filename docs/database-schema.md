# Database Schema

Spenditure uses **SQLite** via **Prisma 5**. The database file lives at `/var/data/prod.db` on Render's Persistent Disk and at `file:./dev.db` locally.

---

## Entity Relationship Diagram

```
User
 ├──< Account
 │     └──< Transaction (accountId)
 │     └──< Transaction (toAccountId — transfers)
 ├──< Transaction
 ├──< Category
 │     ├──< Category (parentId — subcategories)
 │     └──< Transaction
 │     └──< Budget
 ├──< Budget
 └──< RecurringTransaction
```

---

## Models

### User

The single owner of all data. Created once via `POST /api/v1/auth/setup`.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `email` | String (unique) | Always `owner@spenditure.local` |
| `name` | String | Display name |
| `pinHash` | String | bcrypt hash (10 rounds) of the 4-digit PIN |
| `currency` | String | Default `UGX` |
| `loginAttempts` | Int | Consecutive failed logins (resets on success) |
| `lockedUntil` | DateTime? | Set to `now + 15 min` after 5 failures |
| `refreshTokenHash` | String? | bcrypt hash of current refresh token |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |

---

### Account

A financial account owned by the user.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK → User |
| `name` | String | Display name (e.g. "DFCU Bank") |
| `type` | String | `BANK` \| `MOBILE_MONEY` \| `CASH` \| `SAVINGS` \| `INVESTMENT` |
| `balance` | Decimal | Current balance (recomputed from transactions, not stored incrementally) |
| `currency` | String | Default `UGX` |
| `color` | String | Hex color for UI (e.g. `#1A2B22`) |
| `icon` | String | Icon name (e.g. `building-2`, `smartphone`, `wallet`) |
| `isArchived` | Boolean | Soft-delete flag |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Default accounts** seeded on first setup: DFCU Bank, MTN MoMo, Cash.

---

### Transaction

A financial event — income, expense, or transfer.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK → User |
| `accountId` | String | FK → Account (source account) |
| `categoryId` | String? | FK → Category (optional) |
| `type` | String | `INCOME` \| `EXPENSE` \| `TRANSFER` |
| `amount` | Decimal | Always positive (type determines direction) |
| `description` | String | Short label |
| `note` | String? | Free-form notes |
| `date` | DateTime | Transaction date (user-specified, not created-at) |
| `toAccountId` | String? | FK → Account (destination for transfers only) |
| `importSource` | String? | `DFCU_PDF` \| `MOMO_EML` — set on import |
| `externalRef` | String? | Dedup key from import (SHA-256 hash or MoMo TxID) |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Balance invariant:** Account balance is always `SUM(INCOME amounts) - SUM(EXPENSE amounts)` computed fresh — never stored incrementally. This prevents drift after edits and imports.

---

### Category

A spending/income category, optionally nested one level deep.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK → User |
| `name` | String | e.g. "Food & Drink" |
| `type` | String | `INCOME` \| `EXPENSE` |
| `icon` | String | Icon name |
| `color` | String | Hex color |
| `parentId` | String? | FK → Category (parent — `null` for top-level) |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Default categories** are seeded via `CategoriesService.seedDefaults()` when the first user is created.

---

### Budget

A spending limit for a category over a repeating period.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK → User |
| `categoryId` | String | FK → Category |
| `amount` | Decimal | Budget limit |
| `period` | String | `WEEKLY` \| `MONTHLY` \| `QUARTERLY` \| `YEARLY` |
| `startDate` | DateTime | First day of the first period |
| `endDate` | DateTime? | Optional end — budget is open-ended if null |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

`spent` and `remaining` are computed on-the-fly by `BudgetsService.computeSpent()` — they walk the period windows forward from `startDate` until the current period is found, then aggregate matching transactions.

---

### RecurringTransaction

A template for transactions that fire on a schedule.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK → User |
| `accountId` | String | FK → Account |
| `categoryId` | String? | FK → Category |
| `type` | String | `INCOME` \| `EXPENSE` |
| `amount` | Decimal | Amount per occurrence |
| `description` | String | |
| `frequency` | String | `DAILY` \| `WEEKLY` \| `BIWEEKLY` \| `MONTHLY` \| `QUARTERLY` \| `YEARLY` |
| `nextDate` | DateTime | Date of the next pending occurrence |
| `endDate` | DateTime? | Stop creating after this date |
| `isActive` | Boolean | Can be paused |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

The daily cron job finds records where `isActive = true AND nextDate ≤ now`, creates real `Transaction` rows, then advances `nextDate`.

---

## Migrations

Migrations live in `apps/api/prisma/migrations/`. They are applied automatically at startup via `npx prisma migrate deploy` (part of the Render start command).

| Migration | What it does |
|---|---|
| `20261010165522_init` | Creates all tables |
| `20261010170026_add_security_fields` | Adds `loginAttempts`, `lockedUntil`, `refreshTokenHash` to User |

To create a new migration locally:

```bash
# Edit prisma/schema.prisma, then:
pnpm --filter @spenditure/api db:migrate
# This creates a new migration file and applies it to dev.db
```

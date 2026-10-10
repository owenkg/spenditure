# API Reference

**Base URL:** `https://spenditure-api.onrender.com`  
**Versioning:** All endpoints are prefixed with `/api/v1/`  
**Interactive docs:** `https://spenditure-api.onrender.com/api/docs` (Swagger UI)

All responses are wrapped in `{ "data": <payload> }` except:
- `204 No Content` responses (delete operations)
- File download responses (CSV/Excel)
- Error responses (`{ "statusCode", "message", "error" }`)

All authenticated endpoints require the `access_token` httpOnly cookie set at login.

---

## Auth

### `GET /api/v1/auth/status`
Public. Check whether the app has been set up.

**Response:**
```json
{ "data": { "isSetup": false } }
```

---

### `POST /api/v1/auth/setup`
Public. First-time setup — creates the owner account and sets a PIN.  
Rate limited: 5 requests per minute.

**Body:**
```json
{ "name": "George", "pin": "1234" }
```

**Response `201`:**
```json
{ "data": { "id": "clx...", "name": "George", "email": "owner@spenditure.local", "currency": "UGX" } }
```
Sets `access_token` and `refresh_token` httpOnly cookies.

---

### `POST /api/v1/auth/login`
Public. Authenticate with PIN.  
Rate limited: 5 requests per minute.  
After 5 consecutive failures the account locks for 15 minutes.

**Body:**
```json
{ "pin": "1234" }
```

**Response `200`:** Same as setup response.  
**Response `401`:** Wrong PIN or account locked.

---

### `POST /api/v1/auth/refresh`
Public (uses `refresh_token` cookie). Rotate tokens.

**Body:**
```json
{ "refreshToken": "<opaque-token-from-cookie>" }
```

**Response `200`:** New tokens issued, old refresh token invalidated.

---

### `POST /api/v1/auth/logout`
Authenticated. Clears cookies and invalidates refresh token.

**Response `204`:** No content.

---

### `GET /api/v1/auth/me`
Authenticated. Returns current user profile.

**Response:**
```json
{ "data": { "id": "clx...", "name": "George", "email": "owner@spenditure.local", "currency": "UGX" } }
```

---

## Accounts

### `GET /api/v1/accounts`
Returns all non-archived accounts with transaction count.

**Response:**
```json
{
  "data": [
    {
      "id": "clx...", "name": "DFCU Bank", "type": "BANK",
      "balance": 3840000, "currency": "UGX",
      "color": "#1A2B22", "icon": "building-2",
      "isArchived": false, "_count": { "transactions": 42 }
    }
  ]
}
```

Account types: `BANK` | `MOBILE_MONEY` | `CASH` | `SAVINGS` | `INVESTMENT`

---

### `GET /api/v1/accounts/:id`
Single account detail.

---

### `POST /api/v1/accounts`
Create an account.

**Body:**
```json
{
  "name": "Airtel Money", "type": "MOBILE_MONEY",
  "balance": 0, "currency": "UGX",
  "color": "#E40521", "icon": "smartphone"
}
```

---

### `PATCH /api/v1/accounts/:id`
Update any fields on an account (all optional).

---

### `DELETE /api/v1/accounts/:id`
Archive (soft-delete) an account. Response `204`.

---

### `GET /api/v1/accounts/:id/balance-history`
Monthly balance snapshots for charts.

**Response:**
```json
{ "data": [{ "month": "2026-10", "balance": 3840000 }] }
```

---

## Transactions

### `GET /api/v1/transactions`
Paginated transaction list.

**Query params:**

| Param | Type | Description |
|---|---|---|
| `limit` | number | Page size (default 20, max 100) |
| `cursor` | string | Cursor for next page |
| `accountId` | string | Filter by account |
| `categoryId` | string | Filter by category |
| `type` | string | `INCOME` \| `EXPENSE` \| `TRANSFER` |
| `dateFrom` | ISO date | Start date filter |
| `dateTo` | ISO date | End date filter |
| `search` | string | Description text search |

**Response:**
```json
{
  "data": {
    "data": [{ "id": "...", "type": "EXPENSE", "amount": 50000, "description": "Lunch", "date": "2026-10-10T..." }],
    "nextCursor": "clx...",
    "total": 142
  }
}
```

---

### `GET /api/v1/transactions/summary`
Aggregate income, expenses, and net flow for a date range.

**Query params:** `dateFrom`, `dateTo` (both optional)

**Response:**
```json
{
  "data": {
    "totalIncome": 3840000,
    "totalExpenses": 1200000,
    "netFlow": 2640000,
    "byCategory": [{ "categoryId": "clx...", "type": "EXPENSE", "total": 450000 }]
  }
}
```

---

### `GET /api/v1/transactions/chart`
Daily income/expense buckets for a sparkline chart.

**Query params:** `days` (number, default 7)

**Response:**
```json
{
  "data": [
    { "date": "2026-10-04", "income": 0, "expense": 45000 },
    { "date": "2026-10-05", "income": 3840000, "expense": 0 }
  ]
}
```

---

### `GET /api/v1/transactions/:id`
Single transaction.

---

### `POST /api/v1/transactions`
Create a transaction.

**Body:**
```json
{
  "accountId": "clx...",
  "categoryId": "clx...",
  "type": "EXPENSE",
  "amount": 50000,
  "description": "Lunch at Café Javas",
  "date": "2026-10-10T12:00:00Z",
  "note": "Optional note",
  "toAccountId": null
}
```

`toAccountId` is only used when `type` is `TRANSFER`.

---

### `PATCH /api/v1/transactions/:id`
Update any fields (all optional).

---

### `DELETE /api/v1/transactions/:id`
Hard delete. Response `204`.

---

## Categories

### `GET /api/v1/categories`
Returns all categories (flat list, includes `parentId` for hierarchy).

Category types: `INCOME` | `EXPENSE`

---

### `POST /api/v1/categories`
**Body:**
```json
{
  "name": "Transport", "type": "EXPENSE",
  "icon": "car", "color": "#FF6B35",
  "parentId": null
}
```

---

### `PATCH /api/v1/categories/:id` / `DELETE /api/v1/categories/:id`
Standard update / delete.

---

## Budgets

### `GET /api/v1/budgets`
Returns all budgets with computed `spent` and `remaining` for the current period.

**Response:**
```json
{
  "data": [
    {
      "id": "clx...", "amount": 500000, "spent": 320000, "remaining": 180000,
      "period": "MONTHLY", "startDate": "2026-10-01T...",
      "category": { "name": "Food", "color": "#FF6B35", "icon": "utensils" }
    }
  ]
}
```

Periods: `WEEKLY` | `MONTHLY` | `QUARTERLY` | `YEARLY`

---

### `POST /api/v1/budgets`
**Body:**
```json
{
  "categoryId": "clx...", "amount": 500000,
  "period": "MONTHLY", "startDate": "2026-10-01"
}
```

---

### `PATCH /api/v1/budgets/:id` / `DELETE /api/v1/budgets/:id`
Standard update / delete.

---

## Recurring Transactions

### `GET /api/v1/recurring`
All recurring transactions ordered by next due date.

**Response:**
```json
{
  "data": [
    {
      "id": "clx...", "type": "INCOME", "amount": 3840000,
      "description": "Salary", "frequency": "MONTHLY",
      "nextDate": "2026-11-01T...", "endDate": null, "isActive": true
    }
  ]
}
```

Frequencies: `DAILY` | `WEEKLY` | `BIWEEKLY` | `MONTHLY` | `QUARTERLY` | `YEARLY`

---

### `POST /api/v1/recurring`
**Body:**
```json
{
  "accountId": "clx...", "categoryId": "clx...",
  "type": "EXPENSE", "amount": 50000,
  "description": "Netflix subscription",
  "frequency": "MONTHLY", "nextDate": "2026-11-01",
  "endDate": null, "isActive": true
}
```

---

### `PATCH /api/v1/recurring/:id`
Supports toggling `isActive` to pause/resume.

---

### `DELETE /api/v1/recurring/:id`
Response `204`.

---

## Import

Both endpoints accept `multipart/form-data` with a `file` field. Max 10 MB.

### `POST /api/v1/import/dfcu`
Import a DFCU Bank PDF statement. Parses transactions and skips duplicates by SHA-256 hash of (date + amount + description).

**Response:**
```json
{ "data": { "imported": 34, "skipped": 2, "total": 36 } }
```

---

### `POST /api/v1/import/momo`
Import an MTN MoMo `.eml` email export. Deduplicates by transaction ID from the email's HTML table.

**Response:** Same shape as DFCU.

---

## Export

### `GET /api/v1/export/csv`
Download all transactions as CSV.

**Query params:** `dateFrom`, `dateTo`, `accountId` (all optional)

**Response:** `text/csv` file download (`transactions.csv`)

---

### `GET /api/v1/export/excel`
Download as Excel workbook (`.xlsx`).

**Response:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

---

## Settings

### `PATCH /api/v1/settings/profile`
Update display name.

**Body:** `{ "name": "George Kivumbi" }`

---

### `PATCH /api/v1/settings/pin`
Change PIN.

**Body:** `{ "currentPin": "1234", "newPin": "5678" }`

**Response `403`:** If current PIN is wrong.

---

### `POST /api/v1/settings/data/clear`
Wipe all transactions. Requires PIN confirmation.

**Body:** `{ "pin": "1234" }`

**Response:** `{ "data": { "cleared": true } }`

---

## Health

### `GET /api/health`
Public. Used by Render for health checks.

**Response `200`:** `{ "data": { "status": "ok", "db": "connected" } }`  
**Response `503`:** If database is unreachable.

---

## Error Responses

```json
{
  "statusCode": 400,
  "message": ["pin must be a 4-digit string"],
  "error": "Bad Request"
}
```

| Code | Meaning |
|---|---|
| 400 | Validation error (see `message` array) |
| 401 | Not authenticated or wrong PIN |
| 403 | Forbidden (e.g. wrong current PIN on change) |
| 404 | Resource not found or doesn't belong to user |
| 429 | Rate limited |
| 500 | Internal server error |

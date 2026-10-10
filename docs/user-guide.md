# User Guide

## Getting started

Open **https://owenkg.github.io/spenditure/** in your browser or add it to your home screen for the full app experience.

### First-time setup

1. The app will show a setup screen — enter your name and choose a **4-digit PIN**
2. Confirm the PIN, then tap **Create account**
3. You're in. Three default accounts are created: DFCU Bank, MTN MoMo, and Cash

Your PIN is the only credential — keep it somewhere safe. There is no password reset.

### Adding to home screen (PWA)

**iPhone (Safari):** Tap the Share button → "Add to Home Screen"  
**Android (Chrome):** Tap the menu (⋮) → "Add to Home Screen" or "Install app"

The app works offline — recently viewed data is cached.

---

## Navigation

The bottom bar has five tabs:

| Tab | What's here |
|---|---|
| **Home** | Balance overview, spending chart, budget progress, recent transactions |
| **Txns** | Full transaction list with filters |
| **Recurring** | Scheduled recurring income/expenses |
| **Accounts** | Account balances and management |
| **Settings** | PIN change, profile, export, data wipe |

---

## Dashboard

The dashboard gives you a snapshot of your finances:

- **Total balance** — sum across all accounts
- **Month in / Month out** — income and expenses for the current calendar month
- **7-day chart** — daily income (green) vs. expenses (red) bar chart for the last week
- **Budget progress** — up to 4 budgets with a fill bar; turns red when over budget
- **Accounts** — each account with its balance and transaction count
- **Recent transactions** — last 5 entries; tap **+** to jump to add a transaction

---

## Transactions

### Adding a transaction

1. Go to **Txns** and tap **+**, or tap **+** on the dashboard
2. Choose **Income** or **Expense** (or **Transfer** to move money between accounts)
3. Fill in: account, category (optional), amount, description, date
4. Tap **Save**

The account balance updates immediately.

### Filtering

In the **Txns** tab you can filter by:
- Account
- Category
- Type (Income / Expense / Transfer)
- Date range
- Text search on description

### Editing or deleting

Tap any transaction to open it, then edit fields or tap **Delete**.

---

## Accounts

### Default accounts

- **DFCU Bank** — your bank account
- **MTN MoMo** — mobile money wallet
- **Cash** — physical cash on hand

### Adding an account

Tap **+** on the Accounts screen. Choose a type, name, color, and icon.

### Archiving

Archived accounts are hidden from the main list but their transactions remain. Tap an account → **Archive** at the bottom.

---

## Budgets

Budgets let you set a spending limit for a category over a repeating period.

### Creating a budget

1. Go to **Accounts → Budgets** (or set up from the dashboard budget card area)
2. Choose a category, set an amount and period (Weekly / Monthly / Quarterly / Yearly)
3. The budget automatically rolls over each period

### Reading the progress bar

- **Green/amber fill** — within budget
- **Red fill** — over budget (spent > limit)
- The number on the right is the percentage used

---

## Recurring transactions

Schedule transactions that repeat automatically — salary, rent, subscriptions.

### Creating a recurring entry

1. Go to **Recurring** tab and tap **+**
2. Choose Income or Expense, enter description, amount, account
3. Pick frequency: Daily / Weekly / Biweekly / Monthly / Quarterly / Yearly
4. Set the **first occurrence** date — this is when the first transaction fires
5. Optionally set an **end date**
6. Tap **Schedule**

The daily scheduler checks at midnight (UTC) for due entries and creates real transactions automatically.

### Pausing and resuming

Tap **Pause** on any entry to stop it firing. Tap **Resume** to re-enable it.

### Deleting

Tap **Delete** — this removes the schedule only. Past transactions created from it remain.

---

## Importing bank statements

### DFCU Bank PDF

1. Log into DFCU Internet Banking → download your statement as PDF
2. In Spenditure, go to **Settings → Import → DFCU PDF**
3. Select the PDF file
4. The import shows how many transactions were added vs. skipped (duplicates)

Duplicates are detected by a fingerprint of date + amount + description — re-importing the same file is safe.

### MTN MoMo EML

1. MTN sends monthly MoMo statements by email — save the email as `.eml` (in Gmail: three-dot menu → Download message)
2. In Spenditure, go to **Settings → Import → MTN MoMo EML**
3. Select the `.eml` file
4. Transactions are deduped by MoMo transaction ID

---

## Exporting data

Go to **Settings → Export**:

- **CSV** — opens a spreadsheet-compatible file download
- **Excel** — `.xlsx` workbook

Both support optional filters for date range and account.

---

## Settings

### Change PIN

**Settings → Change PIN** — enter current PIN, then new PIN twice.

### Update name

**Settings → Profile** — update your display name.

### Clear all data

**Settings → Clear data** — wipes all transactions. Requires PIN confirmation. Accounts and categories are kept; only transactions are deleted.

---

## Troubleshooting

**"Can't find the server" in browser**  
Your ISP's DNS may not have propagated the Render subdomain yet. Switch your DNS to `8.8.8.8` (Google) or `1.1.1.1` (Cloudflare). On Mac: System Settings → Network → your WiFi → DNS.

**Stuck on loading spinner**  
The API may be starting up (Render can take ~30 seconds on first request after inactivity). Refresh after a moment.

**Wrong PIN / locked out**  
After 5 wrong PINs the account locks for 15 minutes. Wait, then try again.

**Import shows 0 imported**  
All transactions in the file already exist (duplicates). Try a different date range of statement.

**Chart shows no bars**  
No transactions in the last 7 days. Add some transactions and the chart will populate.

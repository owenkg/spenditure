# Deployment Guide

Spenditure runs on two platforms:

| Component | Platform | URL |
|---|---|---|
| Frontend (static PWA) | GitHub Pages | `https://owenkg.github.io/spenditure/` |
| Backend (NestJS API) | Render.com Starter | `https://spenditure-api.onrender.com` |

Deployments are triggered automatically on every push to `main`.

---

## Frontend — GitHub Pages

### How it works

GitHub Actions (`ci.yml`) runs on every push to `main`. After lint, typecheck, and build pass, the `deploy-pages` job:

1. Builds the web app with `VITE_API_URL=https://spenditure-api.onrender.com` and `NODE_ENV=production`
2. Uploads `apps/web/build/client/` as a GitHub Pages artifact
3. Deploys it to the `github-pages` environment

The app is served at `/spenditure/` (the repo name). Both Vite's `base` and Remix's `basename` are set to `/spenditure/` in production so assets and routing work correctly.

### Environment protection

The `github-pages` environment is configured in GitHub Settings → Environments to only allow deployments from the `main` branch (not tags). The deploy job is guarded by:

```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

### Manual redeploy

Push any commit to `main` — the workflow runs automatically. To force a redeploy without code changes:

```bash
git commit --allow-empty -m "chore: trigger redeploy" && git push
```

---

## Backend — Render.com

### Service configuration

| Setting | Value |
|---|---|
| Name | `spenditure-api` |
| Service ID | `srv-db57nbbbc2fs73ek98og` |
| Plan | Starter (0.5 CPU, 512 MB) |
| Region | Oregon (us-west1) |
| Root directory | `apps/api/` |
| Build command | `pnpm install --frozen-lockfile; pnpm run build` |
| Start command | `npx prisma migrate deploy && node dist/main` |
| Health check path | `/api/health` |
| Auto-deploy | Yes (on push to `main`) |

### Persistent Disk

SQLite requires a disk that survives redeploys.

| Setting | Value |
|---|---|
| Name | `spenditure-data` |
| Disk ID | `dsk-db58u33bc2fs73entrcg` |
| Mount path | `/var/data` |
| Size | 1 GB |

The database lives at `/var/data/prod.db`. `DATABASE_URL=file:/var/data/prod.db` is set as an environment variable on the service.

### Environment variables

Set in Render → Environment:

| Variable | Description |
|---|---|
| `DATABASE_URL` | `file:/var/data/prod.db` |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | ≥32 character random string |
| `JWT_REFRESH_SECRET` | ≥32 character random string (different from above) |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | `https://owenkg.github.io/spenditure` |

To generate secure secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Build filter

To avoid unnecessary API rebuilds when only the web changes:

```yaml
buildFilter:
  paths: [apps/api, packages, pnpm-lock.yaml]
  ignoredPaths: [apps/web, .github]
```

This is configured in Render → Settings → Build & Deploy.

### Managing via CLI

```bash
# Install Render CLI
brew install render

# Authenticate
render login

# Set workspace
render workspace set tea-db33h80m7kps73ctfhn0

# View logs
render logs -r srv-db57nbbbc2fs73ek98og --tail --output text

# Trigger manual deploy
render deploys create srv-db57nbbbc2fs73ek98og --output text

# Run one-off diagnostic job
render jobs create srv-db57nbbbc2fs73ek98og --start-command "ls -la /var/data/" --confirm
```

### Why `prisma migrate deploy` is in the start command

Render runs the pre-deploy command in a separate runner context. Writes made there may not be visible to the service instance that actually serves traffic. Running migrations as the first step of the start command guarantees they execute in the same filesystem context as the app.

---

## CORS

The API allows the following origins (set via `FRONTEND_URL` env var, comma-separated):

```
https://owenkg.github.io/spenditure
http://localhost:5173  (fallback when FRONTEND_URL is not set)
```

To add a custom domain, update `FRONTEND_URL` on Render:

```
FRONTEND_URL=https://spenditure.example.com,https://owenkg.github.io/spenditure
```

---

## DNS Notes

`spenditure-api.onrender.com` resolves via Cloudflare's CDN (`gcp-us-west1-1.origin.onrender.com`). Some ISP DNS resolvers (including MTN Uganda's default) may have delayed propagation. If the domain doesn't resolve, use Google DNS (`8.8.8.8`) or Cloudflare DNS (`1.1.1.1`).

On macOS:
```bash
sudo networksetup -setdnsservers Wi-Fi 8.8.8.8 1.1.1.1
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```

---

## Release workflow

Tagged releases (`v*.*.*`) trigger `release.yml` which creates a GitHub Release with auto-generated release notes. Pages deployment is handled only by `ci.yml` (push to main), not by the release workflow.

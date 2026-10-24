# Deployment and operations

The application is one Next.js server plus scheduled tasks, sharing a
PostgreSQL 16 + PostGIS database and a document store. Self-hosted, the
scheduled tasks run in a worker from the same Docker image. On Vercel, they run
as Vercel Cron Jobs ([Option C](#option-c-vercel)).

## Status

The stack has been **built and run locally** but **not deployed to a public
host**. The Vercel production build has been rehearsed locally (migrations,
admin bootstrap, `next build`, imports through the cron endpoint) but not run
on Vercel itself. The checks behind that:

- The Docker image builds.
- `docker compose up` starts PostGIS, applies migrations, and passes the web
  and database health checks.
- The worker starts and schedules all jobs.
- The ETL CLI runs inside the image.
- The Playwright suite passes against `next start`.

Before calling it live:

1. Choose a host.
2. Set the secrets below.
3. Point a domain at it.
4. Run the first import.
5. Create an admin account.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string. The database needs the `postgis`, `pg_trgm` and `unaccent` extensions, which the first migration creates; that needs a role allowed to create extensions |
| `DATABASE_URL_UNPOOLED` | no | Direct (non-pooled) connection. When set, migrations use it, as poolers recommend for DDL. Neon's Vercel integration sets it automatically |
| `DATABASE_PREPARE` | no (default true) | Set to `false` behind a transaction-mode pooler that doesn't support protocol-level prepared statements (e.g. Supabase's port 6543). Neon's pooler supports them |
| `DATABASE_POOL_MAX` | no (default 10) | Connections per server instance |
| `SESSION_SECRET` | yes in production | 32+ random characters (`openssl rand -hex 32`). Salts the IP hashes used for rate limiting. In production, configuration loading fails without it, so every database-backed request errors. Sessions themselves are random database tokens, stored hashed |
| `CRON_SECRET` | yes, if using HTTP cron | Bearer token for `/api/cron/<job>` |
| `SITE_URL`, `NEXT_PUBLIC_SITE_URL` | yes (optional on Vercel) | Canonical origin, e.g. `https://www.example.org`, used for canonical links, sitemaps and emails. `NEXT_PUBLIC_*` values are baked in at **build** time. On Vercel, both fall back to the project's production domain |
| `NEXT_PUBLIC_SITE_NAME` | no | Brand name (default "Grammar Atlas") |
| `TRUSTED_PROXY_HOPS` | no (default 1) | Number of proxies that append to `X-Forwarded-For`. See [Proxies](#proxies-and-client-ips) |
| `ANTHROPIC_API_KEY` | no | Turns on LLM-written answers in the assistant. Without it the assistant runs retrieval-only, still with citations |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-opus-5-5` |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | Magic links and reminders. Without a key, emails are written to the log, so magic-link sign-in and reminders don't work for real users |
| `NEXT_PUBLIC_MAP_STYLE_URL` | no | MapLibre style (default OpenFreeMap Positron, no key needed) |
| `STORAGE_DIR` | no | Where fetched source documents are kept (default `./storage`). On Vercel, anything outside `/tmp` is ignored and `/tmp/grammar-atlas` is used |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Vercel only, first deploy | The production build creates or updates this admin account. Remove `ADMIN_PASSWORD` afterwards, because while it is set every production build resets that password |
| `POSTCODES_IO_BASE_URL` | no | Defaults to `https://api.postcodes.io` |
| `NI_POSTCODES_ENABLED` | no (default false) | Northern Ireland postcode data carries Land & Property Services licence restrictions. Enable only after confirming your use is permitted |
| `ETL_USER_AGENT` | recommended | Identifies the crawler to publishers. Include a contact URL |
| `LOG_LEVEL` | no | `debug`, `info`, `warn` or `error` |

## Option A: Docker Compose on a VM

```bash
cp .env.example .env    # set SESSION_SECRET, CRON_SECRET, SITE_URL, NEXT_PUBLIC_SITE_URL, POSTGRES_PASSWORD
docker compose up -d --build
docker compose run --rm web npm run etl -- all            # first import, about 5–10 minutes
docker compose run --rm -e ADMIN_PASSWORD='…' web npm run admin:create -- you@example.org admin
```

Put a TLS-terminating reverse proxy (Caddy, nginx, a cloud load balancer) in
front of port 3000, and keep `TRUSTED_PROXY_HOPS=1`. The `pgdata` and
`storage` volumes hold all state; back up both.

To build behind a corporate proxy that intercepts TLS, pass the proxy as a
build argument and supply its CA certificate to `npm ci`, for example with a
BuildKit secret. The shipped Dockerfile assumes direct internet access.

## Option B: Managed platform

- **Web.** Any Node 22 host or container platform can run `npm run build`
  and `npm start`, or the Docker image.
- **Database.** Any managed Postgres that offers PostGIS 3.x, `pg_trgm` and
  `unaccent`. Run `npm run db:migrate` once per release, before the new web
  version takes traffic.
- **Worker.** Run `npm run worker` as a single always-on process; one
  instance only, since it does not take a lock.
- **Serverless web.** If the web tier is serverless, skip the worker and call
  the HTTP cron endpoints on the schedules below with
  `Authorization: Bearer $CRON_SECRET`. The route sets `maxDuration = 300`
  seconds. Each import takes 15 seconds or less against a local database, so
  there is plenty of headroom.
- **Document store.** `STORAGE_DIR` is a local filesystem path. With more than
  one web or worker instance, mount a shared volume. Object storage (S3/R2)
  is not implemented yet: add it in `src/etl/storage.ts` (`putObject` and
  `getObject`), which is the only module that touches files.

## Option C: Vercel

The repository is ready for Vercel. `vercel.json` sets the build command and
the cron jobs.

- **Build.** `npm run vercel-build` applies migrations for **production**
  builds only, using `DATABASE_URL_UNPOOLED` when present, then runs
  `next build`. It also creates the first admin when `ADMIN_EMAIL` and
  `ADMIN_PASSWORD` are set. Preview builds skip migrations.
- **Cron jobs.** One per import job, plus `maintenance` and `reminders`, on the
  same UTC schedules as the worker. A unit test keeps `vercel.json` in step
  with the job registry. Every schedule runs at most once a day, which keeps
  within Vercel Hobby's cron limit. On Hobby, Vercel may fire anywhere within
  the scheduled hour.
- **Cron authentication.** Vercel sends `Authorization: Bearer $CRON_SECRET`
  automatically when `CRON_SECRET` is set, which is what `/api/cron/<job>`
  checks.
- **Function duration.** The cron route allows 300 seconds, the most every plan
  permits.
- **Files.** Raw source documents are written to `/tmp` and don't survive the
  function instance. Checksums, metadata and extracted text are kept in the
  database, which is all the app reads. For a durable archive, add object
  storage in `src/etl/storage.ts`.
- **Bundling.** The curated research files (`data/curated/`) are bundled into
  the cron and admin functions through `outputFileTracingIncludes`.

### Steps

1. **Code on GitHub.** Vercel deploys a repository's production branch, so
   the Grammar Atlas code must be on that branch. Either import a repository
   whose default branch holds this code, or change **Settings → Git →
   Production Branch** after importing.
2. **Create the project.** In Vercel, choose **Add New → Project** and import
   the repository. The framework is detected from `vercel.json`. The first
   build fails with "DATABASE_URL is not set" until step 3 is done; that's
   expected.
3. **Database.** In the project, open **Storage**, create a **Neon** Postgres
   database and connect it to the project. Choose a London region (AWS
   eu-west-2) to sit near UK users. This adds `DATABASE_URL` (pooled) and
   `DATABASE_URL_UNPOOLED`. Neon supports `postgis`, `pg_trgm` and `unaccent`.
4. **Environment variables** for Production:
   - `SESSION_SECRET`: `openssl rand -hex 32`.
   - `CRON_SECRET`: `openssl rand -hex 32`.
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`: at least 12 characters; remove the
     password after the first successful deploy.
   - Optional: `ANTHROPIC_API_KEY`, `RESEND_API_KEY` with `EMAIL_FROM`, a custom
     `NEXT_PUBLIC_SITE_URL`, and `ETL_USER_AGENT` with a real contact URL.
5. **Redeploy.** Open **Deployments**, choose the latest deployment and select
   **Redeploy**. The build applies migrations and creates the admin.
6. **Load the data.** Sign in at `/admin/login` and use **Run** on the
   dashboard for each job, in this order: `gias`, `ni_schools`, `ofsted_mi`,
   `ees_ks4`, `ees_1618`, `ees_apps_offers`, `editorial`,
   `admissions_documents`. Alternatively, call
   `/api/cron/<job>` with the bearer secret.
7. **Check.** `/api/health` should return `{"ok":true}`, and the homepage
   should show the school counts.

To set the function region close to the database, use the project's
**Settings → Functions → Function Region**.

## Schedules (UTC)

| Task | Schedule | Notes |
| --- | --- | --- |
| `gias` | `0 4 * * 1` (Mon 04:00) | GIAS publishes daily; weekly is enough for identity data |
| `ni_schools` | `0 4 1 * *` | DE NI census is annual; monthly checks catch revisions |
| `ofsted_mi` | `0 5 15 * *` | Ofsted MI is monthly |
| `ees_ks4`, `ees_1618` | `0 5 * * 2` | Weekly checks catch the provisional (Oct/Nov) and revised (Feb/spring) releases |
| `ees_apps_offers` | `0 5 1 * *` | Annual release in June |
| `admissions_documents` | `0 6 * * 3` | Robots-aware and low-rate; changes open review tasks |
| `maintenance` | `15 3 * * *` | Retention rules from the privacy notice, and flags stale records |
| `reminders` | `0 8 * * *` | Sends emails 7 days before each verified date |
| `editorial` | manual | `npm run etl -- editorial` after editing `data/curated/editorial.json` |

The worker runs due tasks one at a time and logs one JSON line per task.

## Proxies and client IPs

Rate limits key on a salted hash of the client IP, taken from the
`X-Forwarded-For` entry that your outermost trusted proxy appended, counting
`TRUSTED_PROXY_HOPS` from the right. Entries further left are supplied by the
client and ignored.

- **One reverse proxy** (nginx with `$proxy_add_x_forwarded_for`, Caddy, a
  cloud load balancer, a platform edge that sets the header): use `1`.
- **A CDN in front of a load balancer:** use `2`.
- **App reachable without a proxy:** the header is entirely client-controlled
  and rate limiting is ineffective. Don't expose port 3000 directly in
  production.

## Releases

1. CI runs lint, typecheck, unit tests, integration tests (PostGIS service)
   and a production build on every push. A nightly job imports live data and
   runs the Playwright and accessibility suites against `next start`.
2. Build the image, run `npm run db:migrate`, then roll the web and worker
   containers.
3. Migrations are forward-only SQL files in `src/db/migrations/`. Generate
   them with `npm run db:generate`; the script fixes drizzle-kit's quoting of
   PostGIS types.

## Monitoring

- `GET /api/health` returns 200 with `{"ok":true}` when the database is
  reachable, and 503 otherwise.
- `/admin` shows data freshness for each source, recent ingestion runs, open
  review tasks and records not refreshed in 30 days.
- A failed job opens an `ingestion_failure` review task (one per job), and
  the next clean run resolves it.
- Logs are JSON lines on stdout and stderr.

## Backups and retention

- Back up Postgres daily (`pg_dump -Fc`) and the storage volume. Source
  documents can be re-fetched, but their checksums are the audit trail.
- The daily `maintenance` task applies the retention periods stated in the
  privacy notice: expired sessions, login tokens, rate-limit windows,
  assistant query logs after 12 months, unconfirmed reminder subscriptions
  after 7 days, and correction submitters' emails 6 months after resolution.

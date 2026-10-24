# Grammar Atlas — UK grammar school intelligence

Grammar Atlas helps families research state grammar schools in England and
Northern Ireland: who each school admits, how its entrance test works, what
happened in past admission rounds, and what the family needs to do next. It is
built on official data, and it labels how certain each fact is.

Three rules shape the product:

1. **Official data first.** Facts come from DfE, Ofsted, DE NI and the schools'
   own admissions arrangements. Every figure carries its source, its licence,
   and when it was last checked. Nothing is invented: no estimated pass marks,
   boundaries or deadlines.
2. **Uncertainty is visible.** Every admissions fact carries a status:
   `officially verified`, `awaiting verification`, `historical`, `estimated`,
   `unavailable` or `conflicting`. Unverified facts are never presented as
   certain.
3. **Qualifying is not an offer.** The eligibility checker keeps three
   questions apart: did the child reach the test standard, which
   oversubscription criterion they might fall under, and whether an offer is
   possible. It never outputs a probability.

## What's in the database now

These counts come from a live import on 24 October 2026, using the ETL in this
repository.

| Data | Count | Source |
| --- | --- | --- |
| English grammar schools (fully selective) | 163 | GIAS bulk extract |
| Partially selective English schools | 3 (awaiting verification) | Editorial list, GIAS identity |
| Northern Ireland grammar schools | 66 | DE NI school-level census |
| Former names / predecessor links | 260 names | GIAS links file |
| Inspections | 210 rows (report cards kept separate from EIF grades) | Ofsted management information |
| GCSE / KS4 and 16–18 results | 8,313 measure rows plus LA and England comparators | Explore Education Statistics API |
| Applications and offers | 14,945 rows (2,135 school-years × 7 measures), entry years 2014–2026 | EES applications and offers |
| Admissions policy passages | 34 (Aylesbury Grammar School 2027) | School's published PDF |

Admissions rules, entrance tests and key dates are added by editors and
checked against the official documents. See
[what still needs human verification](docs/DATA_SOURCES.md#what-still-needs-human-verification).

## Features

- **Directory and search.** Typo-tolerant search by name, abbreviation
  ("QE Barnet"), town or postcode. Filters for gender, sixth form, boarding,
  test, out-of-area route and history. List, map and table views, with
  deep-linkable URLs.
- **School profiles.** An overview plus admissions, 11+, catchment, results,
  inspection and historical-admissions tabs. Every fact shows its source and
  verification status. Thin tabs are `noindex` and left out of sitemaps.
- **Eligibility checker.** Asks only the questions each school's rules need,
  then shows per-criterion outcomes with their assumptions. It never gives a
  probability.
- **Catchment checker.** Uses PostGIS against *verified* boundaries only.
  Straight-line distance is labelled as such; last-offer distances are never
  drawn as boundaries.
- **Comparison.** Compare 2–5 schools with differences highlighted. Each
  comparison gets a stable share URL and a print layout.
- **11+ centre.** Test providers and formats, preparation guidance, and an
  original timed practice tool with per-topic diagnostics.
- **Admissions planner and calendar.** Steps for England (Year 7) and
  Northern Ireland (Year 8 / SEAG). An ICS export holds the verified dates,
  and email reminders are double opt-in.
- **Research assistant.** Retrieval-augmented answers with numbered
  citations, prompt-injection-resistant document handling, and a
  retrieval-only fallback when no API key is set.
- **Admin console.** Data-quality dashboard, review queue with evidence,
  ingestion runs, documents and schools. Roles are editor and admin.
- **Trust pages.** Methodology, data sources with licences, privacy notice
  (UK GDPR), accessibility statement, corrections form.

## Quick start (local)

Requirements: Node.js 22+, and PostgreSQL 16 with PostGIS 3.4.

```bash
cp .env.example .env            # then set SESSION_SECRET and CRON_SECRET
createdb gsi                    # or point DATABASE_URL at your database
npm ci
npm run db:migrate              # schema + PostGIS, pg_trgm and unaccent extensions
npm run etl -- all              # import official data (~5–10 minutes)
ADMIN_PASSWORD='choose-a-long-password' npm run admin:create -- you@example.org admin
npm run dev                     # http://localhost:3000
```

Run `npm run etl -- list` to see each job and its schedule.

## Quick start (Docker)

```bash
cp .env.example .env            # set SESSION_SECRET, CRON_SECRET, POSTGRES_PASSWORD
docker compose up -d --build    # PostGIS, migrations, web app on :3000, scheduler worker
docker compose run --rm web npm run etl -- all
```

## Deploying to Vercel

The repository includes `vercel.json` (build command and cron jobs) and a
build script that applies migrations and can create the first admin. Connect a
Neon Postgres database from the Vercel dashboard. See
[Option C in docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#option-c-vercel) for the
steps.

[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) covers production hosting, schedules
and secrets.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development, production build and server |
| `npm run lint` / `typecheck` | ESLint, and TypeScript in strict mode |
| `npm test` | Unit tests (Vitest) |
| `npm run test:integration` | Integration tests against a disposable PostGIS database (`TEST_DATABASE_URL`, must contain "test") |
| `npm run test:e2e` | Playwright end-to-end, accessibility (axe, WCAG 2.2 AA rules) and mobile layout tests |
| `npm run db:migrate` | Apply migrations |
| `npm run db:generate` | Generate a migration after changing `src/db/schema.ts` |
| `npm run etl -- <job>\|all\|list` | Run ingestion jobs |
| `npm run db:seed` | Alias for `etl all`. There is no fake seed data. |
| `npm run worker` | Long-running scheduler for ETL, retention clean-up and reminders |
| `npm run admin:create -- <email> [admin\|editor]` | Create or update a staff account (password from `ADMIN_PASSWORD`) |

## Project layout

```
src/
  app/            Next.js App Router pages, API routes, sitemaps
  components/     UI (design system, search, school profile, tools, admin)
  content/        Admissions guides and original practice questions
  db/             Drizzle schema and SQL migrations
  domain/         Pure rules: eligibility engine, measures, labels
  etl/            Ingestion runner, parsers, and one adapter per source
  server/         Data access and services (search, catchment, planner, auth, …)
  ai/             Retrieval, knowledge base, assistant providers
  lib/            Shared utilities (env, postcodes, academic years, cron, …)
data/curated/     Editorial research, checked against official sources
scripts/          CLI entry points (migrate, etl, worker, admin)
tests/            Unit and integration tests
e2e/              Playwright tests
docs/             Architecture, data sources, deployment, roadmap, and more
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Data sources and verification status](docs/DATA_SOURCES.md)
- [Deployment and operations](docs/DEPLOYMENT.md)
- [Privacy, security and DPIA notes](docs/PRIVACY_AND_SECURITY.md)
- [Testing](docs/TESTING.md)
- [Competitor comparison](docs/COMPETITORS.md)
- [Roadmap and known gaps](docs/ROADMAP.md)
- [Monetisation plan](docs/MONETISATION.md)

## Licence and data

Code © the repository owner. Public-sector data is used under the
[Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
Admissions documents belong to their publishers: we store them for citation
and quote them only briefly. Northern Ireland postcode lookups are disabled by
default because of Land & Property Services licence terms.

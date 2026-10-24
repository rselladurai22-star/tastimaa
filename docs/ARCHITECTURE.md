# Architecture

Grammar Atlas is a single Next.js application backed by PostgreSQL + PostGIS.
A command-line ETL layer, run by a scheduler worker, keeps the database in step
with official publications. Nothing in the request path calls a third-party
data source except postcode lookups (cached) and the optional LLM.

```
                 ┌──────────────────────────── official publishers ────────────────────────────┐
                 │ GIAS bulk CSV · EES API + release zips · Ofsted MI CSV · DE NI xlsx ·       │
                 │ school admissions PDFs (robots-aware) · postcodes.io                        │
                 └───────────────┬─────────────────────────────────────────────────────────────┘
                                 │ fetch (retries, back-off, robots.txt, checksums)
          ┌──────────────────────▼───────────────────────┐
          │ ETL (src/etl)                                │      storage/ (STORAGE_DIR)
          │ runner → adapter per source → school-store   │────▶ raw documents by checksum
          │ ingestion_runs · ingestion_issues ·          │
          │ change_events · admin_review_tasks           │
          └──────────────────────┬───────────────────────┘
                                 │
          ┌──────────────────────▼───────────────────────┐
          │ PostgreSQL 16 + PostGIS 3.4                  │
          │ pg_trgm + unaccent search · geography points │
          │ & boundaries · provenance on every fact      │
          └──────────────────────┬───────────────────────┘
                                 │ Drizzle ORM / SQL
          ┌──────────────────────▼───────────────────────┐
          │ Next.js App Router (src/app)                 │
          │ server components → src/server services      │
          │ pure rules in src/domain (eligibility)       │
          │ API routes for interactive tools             │
          └───────┬───────────────────────┬──────────────┘
                  │                       │
           browsers (SSR HTML,     Anthropic API (optional; assistant
           small client islands)   answers with citations, else
                                   retrieval-only fallback)
```

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Schema | `src/db/schema.ts`, `src/db/migrations/` | 40 tables. Facts carry provenance columns (`source_document_id`, `source_locator`, `verification_status`, `confidence`, `last_checked_at`) |
| Ingestion | `src/etl/` | Runner with run tracking; parsers for CSV (UTF-8 and Windows-1252), xlsx (dependency-free reader) and PDF (unpdf); one adapter per source under `jobs/` |
| Domain | `src/domain/` | Pure, unit-tested rules: the eligibility engine, measure definitions and status codes, display labels |
| Services | `src/server/` | Search, profiles, catchment, comparison, planner, reminders, auth, rate limiting, sitemaps, indexability |
| AI | `src/ai/` | Retrieval (policy passages, school fact sheets, national rules), assistant providers |
| UI | `src/app/`, `src/components/` | Server-rendered pages; client components only for interactive tools |
| Ops | `scripts/` | Migrate, ETL CLI, scheduler worker, admin creation |

## Data model highlights

- **Identity.** `schools` holds one row per current school, with a stable
  `slug`. `school_identifiers` holds URN, LAESTAB and DENI numbers, including
  predecessor URNs, which are linked through the GIAS links file so that
  history follows academy conversions. `school_names` keeps former names for
  search.
- **Admissions are versioned by cycle.**
  - `admission_cycles` is keyed by nation and entry year.
  - `admission_policies` is one per school and cycle, with a `content_hash`
    for change detection.
  - `admission_criteria` holds ordered oversubscription criteria, with
    machine-readable `conditions`.
  - `score_rules` holds qualifying scores, reserved bands and ranking rules.
  - `admission_events` holds dates.

  English and Northern Irish cycles never share rows.
- **Tests.** `entrance_tests` belong to `test_providers` (GL Assessment, CSSE,
  SEAG). `school_entrance_tests` links a school to a test for an entry year.
- **Geography.**
  - `school_locations` stores a `geography(Point)`, converted from GIAS
    British National Grid eastings and northings with `ST_Transform`.
  - `catchment_boundaries` stores a `geography(MultiPolygon)`, and only
    `officially_verified` boundaries are used for checks.
  - `postcode_cache` stores GB postcode centroids for 30 days.
- **History.**
  - `historical_allocations` holds applications and offers by school, year,
    round and metric, with DfE status codes kept.
  - `academic_results` and `area_results` hold KS4 and 16–18 measures and
    their comparators.
  - `inspections` keeps `inspection_framework` (report card 2025, EIF graded,
    EIF ungraded, pre-2019) so grades are never converted between frameworks.
- **Workflow.** `admin_review_tasks` holds proposed facts with evidence (the
  document, its locator and a quote), and `audit_log` records every editorial
  action. `change_events` records field-level changes detected by imports.

## Ingestion design

- **Run tracking.** `runJob(job, source, fn)` records a run, its counters and
  stats, and the documents it fetched (deduplicated by SHA-256). Issues go to
  `ingestion_issues`. A failure opens one `ingestion_failure` review task per
  job, and a later clean run of that job resolves it.
- **Politeness.**
  - Bulk files and APIs are preferred, and the GIAS website UI is never
    scraped.
  - School websites are fetched only where `robots.txt` allows, with a crawl
    delay and an identifying User-Agent (`ETL_USER_AGENT`).
  - A document that `robots.txt` disallows becomes a manual-upload task.
- **Change detection.**
  - `upsertSchool` compares tracked fields and writes `change_events`.
  - A policy whose text hash changes gets a new version and a review task.
  - Re-running a job with unchanged inputs is a no-op (verified: a second
    GIAS run reports 0 updates).
- **No auto-publish of extracted rules.** Facts extracted from PDFs (PAN,
  scores, dates) are proposals in the review queue. Editorial facts are
  imported as `awaiting_verification` until an editor approves them.

## Request path

- **Server rendering.** Pages are server components and `force-dynamic`, so
  data is always current. Interactive tools (search box, eligibility checker,
  planner, comparison controls, map, practice tool, assistant) are client
  components that call JSON API routes.
- **Search.** A weighted `tsvector` (names, former names, town, LA,
  abbreviations) is combined with `word_similarity` over unaccented names.
  Abbreviations such as "QE" and "KEGS" are expanded, and postcodes and
  outcodes are detected and routed to a distance search.
- **Eligibility.** `src/domain/eligibility.ts` evaluates a stored policy
  against a family's answers using three-valued logic. Each criterion records
  its own assumptions. Unverified or withdrawn sources cap the result at
  "possible". There is no probability output.
- **Catchment.** `ST_Covers` checks a point against verified boundaries for
  the right entry year. Straight-line distance is reported separately and
  labelled as such.
- **SEO.**
  - Clean URLs, `generateMetadata` on every page, JSON-LD (`WebSite` with a
    `SearchAction`, `School` + `EducationalOrganization` with address,
    coordinates and URN, `BreadcrumbList`, `Article` for guides).
  - A sitemap index with per-type sitemaps.
  - Thin profile tabs (no data for that tab) are `noindex` and left out of
    the sitemaps.
  - Unknown slugs return a real HTTP 404.

## Security model (summary)

See [PRIVACY_AND_SECURITY.md](PRIVACY_AND_SECURITY.md) for detail.

- **Sessions.** Database sessions use a random token. Only its SHA-256 hash
  is stored, and the token travels in an HttpOnly, SameSite=Lax, Secure (in
  production) cookie.
- **Credentials and roles.** Staff passwords are hashed with Argon2id
  (19 MiB memory, 2 iterations).
  Parents sign in by magic link, so they have no password. Roles are
  `parent`, `editor` and `admin`, enforced on the server by `requireRole`.
- **Forms and rate limits.** State-changing routes check same-origin. Rate
  limits use Postgres fixed windows keyed by a salted IP hash; for example,
  assistant 10/min, magic link 5 per 15 min, corrections 5/hour.
- **Assistant.**
  - Retrieved text goes in as `document` blocks with citations enabled, and
    the system prompt treats document contents strictly as data.
  - Answers cite their sources, and refusals and `max_tokens` stops are
    handled.
  - Without an API key, the assistant returns the ranked passages and official
    rules directly.
- **Headers.** HSTS, nosniff, `X-Frame-Options: DENY`, strict referrer and
  permissions policies.

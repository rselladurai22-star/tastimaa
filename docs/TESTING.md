# Testing

| Suite | Command | What it covers | Runs in CI |
| --- | --- | --- | --- |
| Unit (Vitest) | `npm test` | Eligibility engine, parsers (CSV, Windows-1252, xlsx, EES helpers, PDF passages), postcodes, academic-year logic, search normalisation, slugs, formatting, measures, directory parameters, cron matching | Every push |
| Integration (Vitest + PostGIS) | `npm run test:integration` | Search, catchment (`ST_Covers`), eligibility against stored rules, comparisons, change detection, planner and ICS, assistant retrieval and fallback, sitemaps and indexability, rate limiting and IP spoofing, ingestion failure tasks, missing-data handling | Every push (PostGIS service) |
| CLI smoke | in CI | `db:migrate`, `admin:create` and `etl list` run outside Next.js | Every push |
| End-to-end (Playwright) | `npm run test:e2e` | Search, directory, profiles, admissions, eligibility, comparison, assistant, calendar, planner, practice, 404s, admin guard, robots and sitemaps | Nightly / manual, after a live data import |
| Accessibility (axe) | part of `test:e2e` | WCAG 2.0/2.1/2.2 A and AA rules on 12 key pages, and colour contrast in dark mode. The map canvas is excluded. Keyboard use of the search combobox is covered by the e2e search test | Nightly / manual |
| Mobile layout | part of `test:e2e` (Pixel 7) | No horizontal scroll on key pages; filter disclosure | Nightly / manual |

Integration tests use a disposable database. `TEST_DATABASE_URL` defaults to
`postgres://gsi:gsi@localhost:5432/gsi_test`, and setup **refuses** any URL
without "test" in it, because it drops and recreates the schema. The fixtures
are fictional schools (Alpha to Epsilon), so tests never depend on live data.

The e2e suite runs against real imported data, because it checks real school
pages. Locally it starts `next dev`; set `E2E_BASE_URL` to test a running
production build (`npm run build && npm start`) or a deployed site.

## Results at the time of writing

- Unit: 57 passed.
- Integration: 26 passed.
- End-to-end, accessibility and mobile: 35 passed against both `next dev` and
  a production `next start`.
- Lint and typecheck: clean.
- Production build: succeeds.
- Docker image: builds, and the compose stack comes up healthy.

## Regression scenarios

The 15 scenarios the platform must handle honestly, and where each is
asserted:

| # | Scenario | Tests |
| --- | --- | --- |
| 1 | School with no defined catchment | `tests/unit/eligibility.test.ts` "scenario 1"; integration "covers scenarios 1, 6, 8, 9, 13 and 15 end to end" |
| 2 | School with a verified mapped catchment | unit "scenario 2"; integration "scenario 2: inside and outside a verified boundary" |
| 3 | School with distance-based priority | unit "scenario 3: distance criteria never claim a rank"; integration "ignores unverified boundaries and explains distance-only schools" |
| 4 | Multiple score thresholds | unit "scenario 4" (Aylesbury-style 121 qualifying score plus reserved 115–120 places) |
| 5 | Out-of-area admission route | unit "scenario 5" |
| 6 | Policy changing between cycles | unit "scenario 6: never uses another year's policy"; integration (2026-only policy excluded from 2027) |
| 7 | Missing historical information | integration "scenario 7" (no rows; history tab `noindex`) |
| 8 | Conflicting admissions sources | unit and integration "scenario 8: conflicting sources block the assessment" |
| 9 | Northern Ireland school using SEAG | unit "scenario 9"; integration end to end; e2e "Northern Ireland profiles don't pretend to have English data" |
| 10 | Incomplete academic performance data | integration "scenario 10" (status code and explanation kept); e2e "results page explains unpublished Progress 8" |
| 11 | Invalid UK postcode | unit and integration "scenario 11" |
| 12 | No child profile | unit "scenario 12: no child information gives questions, not a verdict" |
| 13 | Score from an unrelated test provider | unit "scenario 13"; integration end to end |
| 14 | Historical offer distance read as eligibility | unit "scenario 14: being close to the school is never treated as being in catchment" |
| 15 | Source document unavailable or withdrawn | unit "scenario 15: withdrawn source caps matches to possible and warns"; integration end to end |

## Writing tests

- Pure rules go in `src/domain` and get unit tests. Keep them free of I/O.
- Anything that touches SQL gets an integration test using the fixtures in
  `tests/integration/fixtures.ts`; add a fictional school if you need a new
  case.
- `server-only` is stubbed in Vitest (`tests/support/server-only-stub.ts`).
- For e2e selectors, prefer roles and accessible names (`getByRole`,
  `getByLabel`). Where the mobile and desktop filter forms both render, scope
  to the visible one.

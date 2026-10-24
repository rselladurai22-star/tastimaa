# Data sources and verification status

Every row the platform publishes can be traced to a source document. The
`/data-sources` page lists them with their licences and last refresh, and
`/methodology` explains how they are combined. This file is the operator's
reference.

## Automated sources (live)

| Job | Source | Method | Licence | Schedule (UTC) | What we import |
| --- | --- | --- | --- | --- | --- |
| `gias` | [GIAS downloads](https://get-information-schools.service.gov.uk/Downloads): all establishment data, plus the links file | Bulk CSV (Windows-1252). The GIAS UI is never scraped | OGL v3 | Mon 04:00 | Identity (URN, LAESTAB), status, admissions policy (selective), gender, age range, sixth form, boarding, religious character, trust, LA, address, location (BNG → WGS84), census numbers, website. Predecessor URNs and former names come from the links file |
| `ni_schools` | [DE NI school enrolments, school-level data](https://www.education-ni.gov.uk/articles/school-enrolments-school-level-data) | xlsx download | Crown copyright, OGL v3 | 1st of month 04:00 | Grammar schools (School Type = Grammar): DENI number, name, management type, town and postcode, enrolment. Gender is not given at school level, so it shows as "Not recorded" |
| `ofsted_mi` | [Ofsted monthly management information](https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes) | CSV | OGL v3 | 15th of month 05:00 | Latest inspections. Report-card inspections (from Nov 2025), EIF graded and EIF ungraded outcomes are stored under separate frameworks and **never converted** into one another |
| `ees_ks4` | [Explore Education Statistics: KS4 performance](https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance) | EES public API | OGL v3 | Tue 05:00 | Attainment 8, Progress 8 (with confidence intervals), EBacc APS, % grade 5+ and 4+ in English and maths, entries, cohort; LA and England comparators, including the national selective-school average |
| `ees_1618` | [EES: 16–18 performance](https://explore-education-statistics.service.gov.uk/find-statistics/16-to-19-performance) | EES public API | OGL v3 | Tue 05:00 | A level average point score and grade, cohort sizes, other 16–18 measures |
| `ees_apps_offers` | [EES: secondary applications and offers](https://explore-education-statistics.service.gov.uk/find-statistics/secondary-and-primary-school-applications-and-offers) | Release zip, school-level CSV | OGL v3 | 1st of month 05:00 | By school and entry year (2014–2026): times named as any preference and as first preference, offers made, first-preference offers, preferred offers, cross-LA applications and offers |
| `admissions_documents` | Schools' determined admission arrangements (manifest: `data/curated/admissions-documents.json`) | PDF, fetched only where `robots.txt` allows | Publisher's own; stored for citation, quoted briefly | Wed 06:00 | Text passages for retrieval and citation, plus **proposed** facts (PAN, scores, dates) for editor review. Nothing extracted is published automatically |
| on demand | [postcodes.io](https://postcodes.io/) (ONS Postcode Directory) | API | OGL v3 (GB) | Cached 30 days | Postcode centroid, LA, region. Northern Ireland lookups stay disabled until `NI_POSTCODES_ENABLED=true` and LPS licence terms are confirmed |

Status codes in DfE data (`c` confidential, `x` not available, `z` not
applicable, `low` small cohort, `u` low reliability, `:` not published) are
kept and explained on the page, never turned into zeros.

Known data features:

- **2021 demand spike.** Applications data shows a genuine spike for the 2021
  entry year in some areas. We checked it against the raw DfE file and show it
  with a neutral caption.
- **Progress 8.** It was not published for 2024/25 or 2025/26, because those
  cohorts have no key stage 2 baseline (the COVID-19 cancellations). Profiles
  explain the gap instead of leaving it blank.
- **Progress 8 for selective schools.** Values are relative to all
  state-funded schools, and the page says so.

## Editorial sources (curated, cited)

`data/curated/editorial.json` holds facts that no bulk dataset publishes:
tests, providers, key dates, school–test links, admissions policies and
partially selective schools. Each item names the official page it was checked
against and the date it was retrieved. The `editorial` job imports items as
`awaiting_verification`, opens review tasks, and versions policies by content
hash.

| Source | Publisher | Status |
| --- | --- | --- |
| [GOV.UK: how to apply](https://www.gov.uk/schools-admissions/how-to-apply), [admission criteria](https://www.gov.uk/schools-admissions/admissions-criteria), [appeals](https://www.gov.uk/schools-admissions/appealing-a-schools-decision) | GOV.UK | Officially verified: national closing date 31 October, national offer day 1 March, appeal rules |
| [The Secondary Transfer Test](https://www.thebucksgrammarschools.org/the-secondary-transfer-test) | The Buckinghamshire Grammar Schools | Awaiting verification |
| [CSSE 11+](https://csse.org.uk/) | Consortium of Selective Schools in Essex | Awaiting verification |
| [SEAG key dates](https://seagni.co.uk/guidance/key-dates), [assessment guide](https://seagni.co.uk/guidance/assessment-guide) | SEAG | Awaiting verification |
| [Methodist College Belfast, Form 1 admissions](https://www.methody.org/admissions/form-1-admissions) | The school | Awaiting verification |
| [Kent Test](https://www.kent.gov.uk/education-and-children/schools/school-places/kent-test) | Kent County Council | **Unavailable**: the site returns HTTP 403 to automated access, so an editor must enter the details |

## What still needs human verification

Ordered by impact on families. Everything here is labelled on the site until
an editor approves it in `/admin/review`.

1. **Admissions policies and criteria.** Only one policy is loaded so far:
   Aylesbury Grammar School 2027 (PAN 186, qualifying score 121, up to 6
   places reserved for scores 115–120, and 10 oversubscription criteria). It
   was extracted from the school's determined arrangements and is awaiting
   verification. Every other school shows "No admissions policy held for this
   year", which is honest but means the eligibility checker can only ask
   generic questions for them.
2. **Manual document uploads.**
   - Pate's Grammar School: `robots.txt` disallows `*.pdf`.
   - Colchester Royal Grammar School: its CDN's `robots.txt` blocks
     automated fetches.

   Review tasks exist for both.
3. **Entrance tests.**
   - The Buckinghamshire STT (13 schools) and CSSE 11+ (10 schools) need
     their formats, dates and qualifying rules confirmed.
   - SEAG dates for the 2027 transfer need confirming: registration closes 20
     October 2026, papers on 14 and 21 November 2026, outcomes on 23 January
     2027, and the re-mark window opens 25 January 2027.
   - The Kent Test needs entering by hand.
   - Other consortia and single-school tests are not yet linked, so their
     schools show "Entrance test: not yet recorded". These include
     Birmingham/King Edward VI, Lincolnshire, Trafford, Wirral, Medway,
     Sutton (SET), Reading/Slough/Bexley/Bromley and the Barnet schools.
4. **Partially selective schools.** St Bernard's High School, St Thomas More
   High School and Shoeburyness High School are listed as CSSE members, but
   GIAS records them as non-selective. Their number of selective places must
   be confirmed from their arrangements.
5. **Catchment boundaries.** None are loaded yet. Councils publish them as
   PDFs or maps, so each must be digitised and verified before use. Until
   then the catchment checker states that no verified boundary is held and
   reports straight-line distance only, labelled as such.
6. **Last distance offered and cut-off scores.** These come from council
   allocation reports, which vary in format. None are loaded yet; the
   schema (`historical_allocations` with `round` and `category`) is ready
   for them.

## Wales and Scotland

State-funded secondary schools in Wales and Scotland are comprehensive: they
do not select by academic ability, so there are no state grammar schools or
11+ tests. The "Wales and Scotland" guide explains how places are allocated
there and points to GOV.WALES and mygov.scot. The site does not
create empty school pages for either nation.

## Adding a source

1. Add a definition to `src/etl/sources.ts`, with its licence and cadence.
2. Write an adapter in `src/etl/jobs/` that uses `runJob`, records each
   fetched file with `ctx.recordDocument`, and reports problems with
   `ctx.issue`.
3. Register it in `src/etl/jobs/index.ts`, with a cron schedule or `manual`.
4. Add parser tests in `tests/unit/` and, where it touches the database, an
   integration test.

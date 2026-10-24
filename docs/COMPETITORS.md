# Competitor comparison

Researched on 24 October 2026. Many school-guide sites block automated access,
so each claim below is marked by how it was checked:

- **Read**: we read the competitor's own page directly.
- **Snippet**: seen in search-engine results quoting the competitor's own
  pages. Likely accurate, but the full page was not read.
- **Assumed**: general knowledge or reputation, not checked this time, because
  the site returned HTTP 403 or 429 to automated requests. Verify by hand
  before using any of these claims externally.

## Summary matrix

| Capability | Grammar Atlas | School Atlas | Locrating | FindMySchool | Atom Learning | ElevenPlusExams | Good Schools Guide | GOV.UK Compare School Performance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Grammar-specific directory | ✔ England + NI, 232 schools | ✔ (school-wide) — Snippet | ✔ map of all schools — Snippet | ✔ grammar list — Snippet | Rankings of "all 163 state grammar schools in England" by Attainment 8 — Read | Forum and region pages — Snippet | Grammar admissions guide — Assumed (403) | All schools; no admissions — Assumed (403) |
| Northern Ireland grammar schools | ✔ 66 schools, SEAG, Year 8 rules kept separate | Not seen | Not seen | Not seen | Not seen | Forum covers NI — Assumed | Not seen | England only — Assumed |
| Last distance offered | Schema ready, no data yet | ✔ per year, council allocation data; older years behind Pro — Read | ✔ "where it has the data", drawn as a dotted line — Snippet | Shows "Not published" for some schools — Snippet | — | Forum threads — Snippet | — | — |
| Applications per place / first preferences | ✔ DfE official, 2014–2026, with status codes | ✔ applications and first preferences — Read | Assumed | ✔ "Application Demand" %, applications vs offers — Snippet | — | Forum — Snippet | — | — |
| Qualifying / pass scores | ✔ only from determined arrangements, awaiting verification | Shows a "Score" value in some years — Read | Assumed | — | — | Historic, forum-sourced pass marks (e.g. Birmingham 2017–18) — Snippet | — | — |
| Catchment tool | Verified boundaries only (none loaded yet); straight-line distance labelled | "Check my postcode" against past cut-offs — Read | Catchment indicators from census data on where pupils live, which it says are "not the same as" LA last-distance figures — Snippet | — | — | — | — | — |
| Eligibility reasoning (qualify ≠ match ≠ offer) | ✔ per-criterion, no probability | Estimates "whether a postcode's distance would have received an offer" — Read | Filter hides schools you're "outside" of (its blog warns about this) — Snippet | — | — | — | — | — |
| Exam results | ✔ KS4 and 16–18 with LA, national and selective comparators | Assumed | ✔ links to exam results — Snippet | ✔ GCSE, A level and Oxbridge rankings — Snippet | ✔ Attainment 8 ranking — Read | — | Assumed | ✔ the official source — Assumed |
| Inspections | ✔ report cards and EIF kept separate | Assumed | ✔ Ofsted icons — Snippet | Own "independent" score, says not endorsed by Ofsted — Snippet | — | — | Own reviews — Assumed | ✔ — Assumed |
| Compare schools | ✔ 2–5, differences highlighted, stable share URL, print | Nearby-school links — Read | Assumed | Assumed | — | — | Assumed | ✔ — Assumed |
| Admissions planner / calendar | ✔ England and NI steps, ICS, double opt-in reminders | Links to application dates — Read | — | — | Weekly study plans — Read | Forum — Assumed | — | — |
| 11+ practice | Original timed sets with topic diagnostics (small) | — | — | — | ✔ papers with photo marking, plans, peer comparison, tuition — Read | ✔ shop, mocks, forum — Assumed | — | — |
| AI assistant | ✔ cited answers, retrieval-only fallback | Not seen | Not seen | Not seen | Not seen | — | — | — |
| Source and licence shown on each fact | ✔ every fact, with verification status | OGL statement and data caveat — Read | Partial — Snippet | Disclaimer — Snippet | No source given for some claims (e.g. "67 grammar schools without catchment") — Read | Forum provenance | Assumed | ✔ official |
| Paywall | None today (see MONETISATION.md) | "Pro" tier for older years — Read | Paid subscription — Snippet (reviews) | Assumed | Paid subscription with trial — Read | Shop — Assumed | Subscription — Assumed | Free |

## Where Grammar Atlas leads

1. **Honest labelling as a product feature.** Every admissions fact carries a
   verification status, a source document and a last-checked date. None of
   the sites we could read do this per fact. Competitors that do publish
   sources tend to put a general caveat in the footer (School Atlas) or none
   at all (Atom's "67 schools without catchment" figure).
2. **Northern Ireland.** No competitor we checked covers NI grammar schools
   alongside England while keeping the systems apart (SEAG, Year 8, EA
   process).
3. **Separating qualifying, matching and offers.** Competitor tools estimate
   whether a past cut-off "would have" given an offer (School Atlas) or hide
   schools you're "outside" of (Locrating). Our checker explains which
   criterion a child would fall under, and why that is not a prediction.
4. **Cited AI assistant.** We found no competitor offering an AI assistant
   that grounds its answers in admissions documents and cites them.
5. **Official history.** We hold DfE applications and offers data from 2014
   to 2026 for every grammar school, with suppression codes kept, and
   historical charts appear only where the values are comparable.

## Where competitors lead (and what to do)

| Gap | Who leads | Plan |
| --- | --- | --- |
| Last distance offered and cut-off scores, many years | School Atlas (Read), Locrating (Snippet) | Ingest council allocation reports (Kent, Bucks, Trafford, Lincolnshire, Birmingham first). Store by round and category; never draw them as boundaries. See ROADMAP |
| Catchment indicators from pupil home locations | Locrating (Snippet) | Pupil-residence data isn't open. Don't imitate it; publish verified council boundaries instead |
| Breadth of 11+ practice, tuition, mocks | Atom Learning (Read), ElevenPlusExams (Assumed) | Partner rather than compete. Our practice tool stays small and original |
| Community and peer knowledge | ElevenPlusExams forum (Snippet) | Out of scope. Link to official sources instead of forum figures |
| Independent reviews | Good Schools Guide (Assumed) | Out of scope for state grammar schools; could add parent Q&A later with moderation |
| Rankings | FindMySchool, Atom | Deliberately not ranking. Comparisons state the criteria and their limits |

## Sources consulted

- School Atlas, Altrincham Grammar School for Boys admissions history:
  https://www.schoolatlas.co.uk/trafford/schools/altrincham-grammar-school-for-boys-bowdon/admissions-history
  (Read)
- Atom Learning, "Which grammar schools don't have a catchment area?":
  https://www.atomlearning.com/blog/grammar-schools-without-catchment-areas
  (Read)
- Locrating blog pages on catchment areas and last distance offered:
  https://www.locrating.com/Blog/locrating-catchment-areas-explained.aspx,
  https://www.locrating.com/blog/collecting-last-distance-offered-data.aspx
  and https://www.locrating.com/Blog/moving-home-and-schools.aspx
  (Snippet; direct fetch returned 403)
- FindMySchool grammar-school pages, for example
  https://findmyschool.uk/grammar-schools-near-me and
  https://findmyschool.uk/schools/gravesend/gravesend-grammar-school-137099
  (Snippet; direct fetch returned 429)
- ElevenPlusExams forum and Protégé pass-mark page:
  https://protege.elevenplusexams.co.uk/?p=1209 (Snippet; site returned 403)
- Good Schools Guide grammar admissions:
  https://www.goodschoolsguide.co.uk/choosing-a-school/grammar-schools/admissions
  (Assumed; 403)
- GOV.UK Compare School Performance:
  https://www.compare-school-performance.service.gov.uk/ (Assumed; 403)
- Lincolnshire County Council FOI disclosures with last-distance and score
  data, which suggest a possible official source for allocation history:
  https://www.lincolnshire.gov.uk/directory-record/80358/eleven-plus-data-for-horncastle-grammar-school-alford-grammar-school-and-skegness-grammar-school
  (Snippet)

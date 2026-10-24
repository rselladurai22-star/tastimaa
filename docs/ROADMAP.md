# Roadmap and known gaps

Milestones follow the build priorities in the original brief. ✔ means built and
tested, ◐ means the foundation is in place but data or polish is missing, and ✗
means not started.

## Milestone 1: working foundation ✔

| Item | Status |
| --- | --- |
| App shell, homepage (12 sections), navigation, design system (light/dark, WCAG 2.2 AA checks) | ✔ |
| Schema, migrations, official imports (GIAS, DE NI, Ofsted, EES) | ✔ |
| Directory, search, filters, regional pages, list/map/table views | ✔ |
| School profile with tabs, source attribution | ✔ |
| SEO: metadata, JSON-LD, sitemaps, `noindex` for thin tabs, real 404s | ✔ |

## Milestone 2: admissions intelligence

| Item | Status |
| --- | --- |
| Versioned policies by cycle, criteria, score rules, events | ✔ schema and UI |
| Policy source management and document store (checksums) | ✔ |
| PDF extraction into a review queue (proposals only) | ✔ |
| Admin verification workflow with evidence and audit log | ✔ |
| Entrance test information | ◐ Bucks STT, CSSE and SEAG loaded and awaiting verification; Kent Test blocked (403); other consortia not yet entered |
| **Policies for every grammar school** | ◐ 1 of 232 loaded. This is the biggest content gap; see "Next" below |
| Basic comparison | ✔ (advanced too) |

## Milestone 3: interactive decision tools

| Item | Status |
| --- | --- |
| Postcode lookup (GB), with NI gated by licence | ✔ |
| Geospatial discovery (distance search, map) | ✔ |
| Catchment analysis for verified boundaries | ◐ engine and UI built; **no verified boundaries loaded yet** |
| Rule-based eligibility explanations | ✔ (works fully only where a policy is loaded) |
| Historical charts | ✔ applications and offers 2014–2026; ◐ last distance and cut-off scores not yet ingested |
| Advanced comparisons | ✔ |

## Milestone 4: personalisation and AI

| Item | Status |
| --- | --- |
| Saved schools (browser, plus optional account sync) | ✔ |
| Admissions planner, ICS export | ✔ |
| Email reminders (double opt-in) | ◐ built; needs `RESEND_API_KEY` to send |
| Evidence-backed AI adviser | ✔ retrieval-only mode (tested). ◐ LLM answers with `ANTHROPIC_API_KEY`: the provider is written against the Anthropic SDK and type-checks, and the assistant pipeline is tested with a stub provider, but it has not been run against the live API (no key in this environment) |
| Parent dashboard (`/account`) | ✔ basic |

## Milestone 5: growth

| Item | Status |
| --- | --- |
| Advanced SEO templates (area pages, guides, test pages) | ✔ |
| Editorial guides (7) | ✔ |
| Research analytics (privacy-preserving usage counts) | ✗ |
| Monetisation preparation | ◐ plan only (see MONETISATION.md) |
| Premium products | ✗ |

## Next, in priority order

1. **Admissions policies for all 232 schools.** For each school, find its
   determined arrangements for 2027 entry, add it to
   `data/curated/admissions-documents.json`, run `admissions_documents`, and
   approve the extracted facts in `/admin/review`. Start with the highest
   search demand: Kent, Buckinghamshire, Birmingham, Sutton, Barnet,
   Trafford, Lincolnshire, Essex, Medway, Wirral.
2. **Entrance tests and dates** for the remaining consortia and single-school
   tests. Enter the Kent Test by hand.
3. **Allocation history** (last distance offered and lowest score by round),
   from council allocation reports and FOI disclosures. The schema already
   supports rounds and categories.
4. **Verified catchment boundaries.** Digitise council maps where licences
   allow, store the effective entry year, and verify against the policy text.
5. **Content-Security-Policy with nonces.**
6. **Object storage** for documents (S3/R2) when running more than one
   instance.
7. **Privacy-preserving analytics**: aggregate page and tool counts only, no
   cookies.
8. **NI postcodes**, once the LPS licence position is confirmed.

## Known limitations

- **Interpreting extracted policies.** Text extraction struggles with
  complex tables in some PDFs. Extracted facts are never published without
  review.
- **Partially selective schools.** Three are listed, awaiting verification.
  GIAS records them as non-selective, so the "selective places" count must
  come from their arrangements.
- **NI schools.** Gender and some characteristics aren't in DE NI
  school-level data and show as "Not recorded".
- **Progress 8.** It isn't published for 2024/25 or 2025/26, and pages explain
  why.
- **The assistant.** It answers only from what the database holds, so for
  schools without a loaded policy it says so and points to the official
  source.

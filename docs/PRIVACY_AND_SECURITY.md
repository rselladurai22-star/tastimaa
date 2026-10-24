# Privacy, security and DPIA notes

These are working notes for a data protection impact assessment (DPIA). They
are not legal advice. The public privacy notice (`/privacy`) is marked
"Draft for legal review before launch". Have it reviewed before going live.

## Design stance

The site serves parents and carers. It is designed to work fully **without an
account**, and it **never collects data that identifies a child**: no name, no
date of birth, no school, no scores tied to a person. The eligibility checker
asks for a year group, test status and score only for the request in hand, and
neither stores nor logs the answers.

## Personal data inventory

| Data | Where | Lawful basis | Retention | Notes |
| --- | --- | --- | --- | --- |
| Shortlist, planner ticks, practice history | Browser localStorage only | n/a (never sent to us) | Until the user clears it | Shortlists can be synced to an account by choice |
| Looked-up GB postcodes and their centre points | `postcode_cache` | Legitimate interests | 30 days, deleted by the daily `maintenance` task | Not linked to a person or session |
| Assistant questions and answers | `ai_queries` | Legitimate interests (service improvement) | 12 months, deleted by `maintenance` | No user or IP identifiers. Users are told not to include personal details |
| Account email, saved schools | `users`, `saved_schools` | Contract | Until the account is deleted (immediate, self-service) | Parents sign in by magic link; no password |
| Session | `sessions` (SHA-256 token hash), HttpOnly cookie | Contract | Until expiry, then deleted | Cookie holds a random token only |
| Magic-link tokens | `login_tokens` (hash) | Contract | 20-minute validity, single use; deleted a day after expiry | |
| Reminder subscription | `reminder_subscriptions` | Consent (double opt-in) | Unconfirmed: 7 days. Confirmed: until unsubscribe, which deletes the row | Email and chosen schools only |
| Correction submitter email | `admin_review_tasks.submitted_by_email` | Legitimate interests | Removed 6 months after the correction is resolved | Optional field |
| Salted IP hash (rate limiting) | `rate_limits` | Legitimate interests (abuse prevention) | Up to 1 hour | Salt is `SESSION_SECRET`; raw IPs are never stored |
| Staff accounts | `users` (Argon2id hash), `audit_log` | Legitimate interests / contract | While employed, plus audit retention | Roles: editor, admin |

## Processors and transfers

- **Hosting provider.** Choose a UK or EU region.
- **Email: Resend.** Used only when `RESEND_API_KEY` is set.
- **Anthropic: assistant answers.** Used only when `ANTHROPIC_API_KEY` is set.
  The question and retrieved *public* documents are sent; no user
  identifiers. Confirm the processor terms and the transfer mechanism (UK
  IDTA or Addendum) before enabling.
- **postcodes.io.** Receives the postcode only.
- **OpenFreeMap.** Serves map tiles; the browser fetches them directly, so the
  user's IP is visible to the tile host. Self-host tiles if that's
  unacceptable.

There are no analytics or advertising trackers, and no cookies besides the
session cookie for signed-in users. Because there are no non-essential
cookies, no consent banner is needed.

## Children's code (ICO Age appropriate design code)

The audience is adults. The site works without profiling, has no nudges to
share data, has no geolocation (postcodes are typed), and keeps everything
private by default. If children may use the 11+ practice tool, its history
stays in their browser and nothing is sent to the server.

## Security controls

| Area | Control |
| --- | --- |
| Authentication | Magic links for parents. Argon2id passwords (19 MiB, t=2) for staff, with constant-time comparison against a dummy hash when the user doesn't exist. Sessions are random 256-bit tokens stored hashed |
| Authorisation | `requireRole` on every admin page, server action and API route. Admin routes are `noindex` and disallowed in robots.txt |
| CSRF | State-changing API routes check `Origin`, falling back to `Sec-Fetch-Site`. Cookies are `SameSite=Lax`. Server actions get Next.js's built-in origin check |
| Rate limiting | Per route, Postgres-backed so it works across instances. Keys use the trusted-proxy hop count (see DEPLOYMENT.md). It fails open so an outage can't take the site down |
| Input validation | zod on every JSON request body; query parameters are parsed, allow-listed and clamped. Postcodes are validated before any lookup. Search input is normalised and parameterised; SQL is only ever built with Drizzle's tagged templates |
| Output | React escaping. The only `dangerouslySetInnerHTML` is the JSON-LD component, which escapes `<` |
| Headers | HSTS (2 years, preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, strict `Referrer-Policy`, restrictive `Permissions-Policy`. `X-Powered-By` is removed |
| Secrets | Read only from environment variables, never logged. `CRON_SECRET` is compared in constant time |
| AI | Retrieved text is passed as citation-enabled documents, and the system prompt treats document contents strictly as data, so injected instructions are ignored. The model has no tools and no access to private data. Output is rendered as text, not HTML. Refusals and truncation are handled. Without a key, the retrieval-only provider is used |
| Ingestion | Fetches go only to configured official hosts and schools' own sites, robots-aware, with timeouts and a 250 MB size cap. Documents are stored by checksum. PDFs are parsed as text and never executed |
| Dependencies | `npm audit --omit=dev` reports 0 vulnerabilities. The full tree has 4 moderate advisories, all from an old esbuild inside `drizzle-kit` (GHSA-67mh-4wv8-2f99, which affects esbuild's dev server, never run here). `exceljs` was dropped because of a vulnerable transitive dependency, in favour of a small xlsx reader |

## Open items before launch

1. Get legal review of the privacy notice, terms and this DPIA. Name the data
   controller and a contact address (`SITE.contactEmail`).
2. Confirm the Northern Ireland postcode licence position before setting
   `NI_POSTCODES_ENABLED=true`.
3. Add a Content-Security-Policy. It needs nonces for Next.js inline scripts
   and to allow the map tile host; that work is not done yet.
4. Set up off-site, encrypted backups, and test a restore.
5. Choose a hosting region, and record the processors in a register of
   processing activities.

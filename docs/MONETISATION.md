# Monetisation plan

Status: **plan only. Nothing here is built**, and the site has no paywall,
adverts or affiliate links. Prices are hypotheses to test, not decisions.

## Principles (non-negotiable)

1. **No paid influence on facts.** Schools, tutors and other businesses can't
   pay to change what a profile says, how comparisons order schools, or what
   the assistant answers.
2. **Free core.** Search, profiles, official data, the eligibility checker,
   the planner and the guides stay free. Families shouldn't need to pay to
   understand a public admissions process.
3. **No selling or sharing of personal data.** No data brokerage, and no
   behavioural advertising.
4. **Clear separation.** Any commercial relationship is labelled where it
   appears and listed on a public "How we make money" page.

## Options, in recommended order

| Option | What | Fits the principles? | Effort | Notes |
| --- | --- | --- | --- | --- |
| 1. Premium alerts and history ("Plus") | Unlimited school watchlists with change alerts when a policy, test date or allocation figure changes; full allocation history exports; printable family pack | ✔ built on verified data the site already holds | Medium: needs billing (Stripe) and entitlement checks | Hypothesis: ~£4–6/month, or ~£25–35 per admissions year. Test willingness to pay before building |
| 2. Data services for schools, councils and researchers | Licensed, cleaned and linked datasets (identity resolution, history, verification status) with an API | ✔ data is OGL, so we charge for the cleaning and linking | Medium | Must respect each source's licence. Admissions-document text is not resold |
| 3. Sponsorship of free tools | A named sponsor for the planner or practice tool | ◐ only with strict separation | Low | The sponsor gets no say over content; disclosed on page |
| 4. Tutoring and practice partners (referral) | Referral links to vetted 11+ preparation providers | ◐ risky | Low | Only with disclosure, no "recommended" rankings, and never shown inside eligibility results. Our own practice tool stays original and free |
| 5. Display advertising | — | ✗ | — | Conflicts with the trust positioning and needs consent banners. Not recommended |

## Preconditions

- Reach meaningful coverage first. Admissions policies for most of the 232
  schools are the core of the value, and the gap is large today (see
  ROADMAP).
- Establish a privacy-preserving analytics baseline (aggregate counts only)
  to size demand.
- Publish the "How we make money" page before the first commercial
  relationship.
- Get legal review of the terms for subscriptions: consumer contract rules,
  cancellation and refunds.

## Metrics to watch

- Share of school pages with a verified current-year policy (quality).
- Eligibility checks and planner sign-ups per 1,000 visits (usefulness).
- Correction submissions resolved within 7 days (trust).
- For Plus: trial-to-paid conversion and churn after offer day. Expect strong
  seasonality from September to March.

import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { ArticleShell, DeepHeading } from "@/ui/article/article";
import { Note } from "@/ui/kit";

export const metadata: Metadata = { title: "Privacy notice", description: "What personal data we collect, why, how long we keep it and your rights under UK GDPR.", alternates: { canonical: "/privacy" } };

const SECTIONS = [
  {
    id: "no-account",
    title: "Used without an account",
    body: (
      <ul>
        <li>
          <strong>Search, profiles, comparisons and guides</strong> — no personal data is collected.
        </li>
        <li>
          <strong>Eligibility checker</strong> — answers are processed only to produce the page and are not stored or logged. We never ask for a child&apos;s name or date of birth.
        </li>
        <li>
          <strong>Postcode tools</strong> — a postcode is sent to postcodes.io to find its centre point. We keep a cache of looked-up GB postcodes and their centre points for 30 days, with no record of who looked them up.
        </li>
        <li>
          <strong>Shortlists, planner ticks and practice history</strong> — stored only in your own browser (local storage). Clear them at any time from the page or your browser settings.
        </li>
        <li>
          <strong>Research assistant</strong> — question text is stored without identifiers to improve answers, and deleted after 12 months. Please don&apos;t include personal details. If an AI provider is configured, questions and retrieved public
          documents are sent to Anthropic to generate the answer.
        </li>
      </ul>
    ),
  },
  {
    id: "email",
    title: "If you choose to give us your email",
    body: (
      <ul>
        <li>
          <strong>Reminder emails</strong> — your email address and chosen schools, on the lawful basis of consent (double opt-in). Unsubscribing deletes the record.
        </li>
        <li>
          <strong>Accounts</strong> — your email address and saved schools, to provide the service you asked for (contract). Delete your account at any time from your account page; deletion is immediate.
        </li>
        <li>
          <strong>Corrections</strong> — an optional email so we can follow up, kept until the correction is resolved plus 6 months.
        </li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "Security and processors",
    body: <p>Session cookies are HttpOnly and contain no personal data; we store only a hash of the session token. Processors: hosting provider, email provider (Resend), and Anthropic (assistant, when enabled).</p>,
  },
  {
    id: "children",
    title: "Children",
    body: <p>The service is designed for parents and carers. We have assessed it against the ICO&apos;s Age appropriate design code: it does not profile users, has no advertising tracking, and collects no child-identifying data.</p>,
  },
  { id: "rate-limiting", title: "Rate limiting", body: <p>To prevent abuse we store a salted one-way hash of IP addresses for up to one hour.</p> },
  { id: "rights", title: "Your rights", body: <p>You can ask for access, correction or deletion of your data, and complain to the Information Commissioner&apos;s Office (ico.org.uk).</p> },
];

export default function PrivacyPage() {
  return (
    <ArticleShell
      crumbs={[{ href: "/privacy", label: "Privacy" }]}
      kicker="The atlas"
      title="Privacy notice"
      lede={<p>We designed this service to work without collecting personal data. This notice explains the few exceptions.</p>}
      description="We designed this service to work without collecting personal data. This notice explains the few exceptions."
      updated="2026-10-24"
      path="/privacy"
      sources={[
        { title: "ICO — UK GDPR guidance", url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/" },
        { title: "ICO — Age appropriate design code", url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/" },
      ]}
      toc={SECTIONS.map((s) => ({ id: s.id, label: s.title }))}
    >
      <Note tone="caution" title="Draft for legal review before launch.">
        The operator of {SITE.name} is the data controller. Contact: {SITE.contactEmail}.
      </Note>
      {SECTIONS.map((s, i) => (
        <section key={s.id} aria-labelledby={s.id}>
          <DeepHeading id={s.id} n={i + 1}>
            {s.title}
          </DeepHeading>
          {s.body}
        </section>
      ))}
    </ArticleShell>
  );
}

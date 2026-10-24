import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { ArticleLayout } from "@/components/layout/article";

export const metadata: Metadata = { title: "Privacy notice", description: "What personal data we collect, why, how long we keep it and your rights under UK GDPR.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <ArticleLayout
      crumbs={[{ href: "/privacy", label: "Privacy" }]}
      title="Privacy notice"
      description="We designed this service to work without collecting personal data. This notice explains the few exceptions."
      updated="2026-10-24"
      path="/privacy"
      sources={[{ title: "ICO — UK GDPR guidance", url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/" }, { title: "ICO — Age appropriate design code", url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/" }]}
    >
      <p>
        <strong>Draft for legal review before launch.</strong> The operator of {SITE.name} is the data controller. Contact: {SITE.contactEmail}.
      </p>
      <h2>Used without an account</h2>
      <ul>
        <li><strong>Search, profiles, comparisons and guides</strong> — no personal data is collected.</li>
        <li><strong>Eligibility checker</strong> — answers are processed only to produce the page and are not stored or logged. We never ask for a child&apos;s name or date of birth.</li>
        <li><strong>Postcode tools</strong> — a postcode is sent to postcodes.io to find its centre point. We keep a cache of looked-up GB postcodes and their centre points for 30 days, with no record of who looked them up.</li>
        <li><strong>Shortlists, planner ticks and practice history</strong> — stored only in your own browser (local storage). Clear them at any time from the page or your browser settings.</li>
        <li><strong>Research assistant</strong> — question text is stored without identifiers to improve answers, and deleted after 12 months. Please don&apos;t include personal details. If an AI provider is configured, questions and retrieved public documents are sent to Anthropic to generate the answer.</li>
      </ul>
      <h2>If you choose to give us your email</h2>
      <ul>
        <li><strong>Reminder emails</strong> — your email address and chosen schools, on the lawful basis of consent (double opt-in). Unsubscribing deletes the record.</li>
        <li><strong>Accounts</strong> — your email address and saved schools, to provide the service you asked for (contract). Delete your account at any time from your account page; deletion is immediate.</li>
        <li><strong>Corrections</strong> — an optional email so we can follow up, kept until the correction is resolved plus 6 months.</li>
      </ul>
      <h2>Security and processors</h2>
      <p>Session cookies are HttpOnly and contain no personal data; we store only a hash of the session token. Processors: hosting provider, email provider (Resend), and Anthropic (assistant, when enabled).</p>
      <h2>Children</h2>
      <p>The service is designed for parents and carers. We have assessed it against the ICO&apos;s Age appropriate design code: it does not profile users, has no advertising tracking, and collects no child-identifying data.</p>
      <h2>Rate limiting</h2>
      <p>To prevent abuse we store a salted one-way hash of IP addresses for up to one hour.</p>
      <h2>Your rights</h2>
      <p>You can ask for access, correction or deletion of your data, and complain to the Information Commissioner&apos;s Office (ico.org.uk).</p>
    </ArticleLayout>
  );
}

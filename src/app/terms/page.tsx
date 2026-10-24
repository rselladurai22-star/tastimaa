import type { Metadata } from "next";
import { ArticleShell, DeepHeading } from "@/ui/article/article";

export const metadata: Metadata = { title: "Terms of use", description: "Terms for using this independent grammar school information service.", alternates: { canonical: "/terms" } };

const SECTIONS = [
  {
    id: "information",
    title: "Information, not advice or decisions",
    body: (
      <p>
        We provide information to help you research schools. We are independent and not a school, council, exam board or government body. Admissions decisions are made by each school&apos;s admission authority under its published arrangements. Always
        check the official documents and deadlines before acting.
      </p>
    ),
  },
  { id: "accuracy", title: "Accuracy", body: <p>We take care to use official sources and label anything unverified, but sources can change or contain errors. We are not liable for decisions made using this site.</p> },
  { id: "licences", title: "Data licences", body: <p>Public sector information is used under the Open Government Licence v3.0. School documents remain the property of their publishers; we link to them and quote briefly for reference.</p> },
  { id: "use", title: "Acceptable use", body: <p>Don&apos;t scrape the site at high rates, attempt to access admin areas, or submit false corrections. Automated access is rate-limited.</p> },
];

export default function TermsPage() {
  return (
    <ArticleShell
      crumbs={[{ href: "/terms", label: "Terms" }]}
      kicker="The atlas"
      title="Terms of use"
      lede={<p>Plain-English terms. Draft for legal review before launch.</p>}
      description="Plain-English terms. Draft for legal review before launch."
      updated="2026-10-24"
      path="/terms"
      sources={[{ title: "Open Government Licence v3.0", url: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" }]}
      toc={SECTIONS.map((s) => ({ id: s.id, label: s.title }))}
    >
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

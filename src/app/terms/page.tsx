import type { Metadata } from "next";
import { ArticleLayout } from "@/components/layout/article";

export const metadata: Metadata = { title: "Terms of use", description: "Terms for using this independent grammar school information service.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <ArticleLayout
      crumbs={[{ href: "/terms", label: "Terms" }]}
      title="Terms of use"
      description="Plain-English terms. Draft for legal review before launch."
      updated="2026-10-24"
      path="/terms"
      sources={[{ title: "Open Government Licence v3.0", url: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" }]}
    >
      <h2>Information, not advice or decisions</h2>
      <p>
        We provide information to help you research schools. We are independent and not a school, council, exam board or government body. Admissions decisions are made by each school&apos;s admission authority under its published arrangements. Always check the official
        documents and deadlines before acting.
      </p>
      <h2>Accuracy</h2>
      <p>We take care to use official sources and label anything unverified, but sources can change or contain errors. We are not liable for decisions made using this site.</p>
      <h2>Data licences</h2>
      <p>Public sector information is used under the Open Government Licence v3.0. School documents remain the property of their publishers; we link to them and quote briefly for reference.</p>
      <h2>Acceptable use</h2>
      <p>Don&apos;t scrape the site at high rates, attempt to access admin areas, or submit false corrections. Automated access is rate-limited.</p>
    </ArticleLayout>
  );
}

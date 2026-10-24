import type { Metadata } from "next";
import Link from "next/link";
import { ArticleShell, DeepHeading } from "@/ui/article/article";

export const metadata: Metadata = { title: "Accessibility statement", description: "How we aim to meet WCAG 2.2 AA, known limitations and how to report a problem.", alternates: { canonical: "/accessibility" } };

export default function AccessibilityPage() {
  return (
    <ArticleShell
      crumbs={[{ href: "/accessibility", label: "Accessibility" }]}
      kicker="The atlas"
      title="Accessibility statement"
      lede={<p>We want everyone to be able to use this site, including people who use screen readers, keyboards or magnification.</p>}
      description="We want everyone to be able to use this site, including people who use screen readers, keyboards or magnification."
      updated="2026-10-24"
      path="/accessibility"
      sources={[{ title: "Web Content Accessibility Guidelines (WCAG) 2.2", url: "https://www.w3.org/TR/WCAG22/" }]}
      toc={[
        { id: "what-we-do", label: "What we do" },
        { id: "limitations", label: "Known limitations" },
        { id: "report", label: "Report a problem" },
      ]}
    >
      <section aria-labelledby="what-we-do">
        <DeepHeading id="what-we-do" n={1}>
          What we do
        </DeepHeading>
        <ul>
          <li>Semantic HTML with landmarks, a skip link and logical headings.</li>
          <li>
            Everything works with a keyboard, with visible focus indicators. Press <kbd>/</kbd> to jump to search.
          </li>
          <li>Text and controls meet WCAG 2.2 AA contrast.</li>
          <li>Every chart has a data table and a text description; colour is never the only signal.</li>
          <li>Maps have an equivalent list of schools.</li>
          <li>Animations respect the &ldquo;reduce motion&rdquo; setting.</li>
          <li>Automated accessibility checks (axe) run in our test suite on key pages.</li>
        </ul>
      </section>
      <section aria-labelledby="limitations">
        <DeepHeading id="limitations" n={2}>
          Known limitations
        </DeepHeading>
        <ul>
          <li>The interactive map is not fully usable with a screen reader; the list view has the same information.</li>
          <li>Linked official PDFs are published by schools and councils and may not be accessible.</li>
        </ul>
      </section>
      <section aria-labelledby="report">
        <DeepHeading id="report" n={3}>
          Report a problem
        </DeepHeading>
        <p>
          Use the <Link href="/corrections">corrections form</Link> to tell us about an accessibility problem. We aim to respond within 5 working days.
        </p>
      </section>
    </ArticleShell>
  );
}

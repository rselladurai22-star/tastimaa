import type { Metadata } from "next";
import { ArticleLayout } from "@/components/layout/article";

export const metadata: Metadata = { title: "Accessibility statement", description: "How we aim to meet WCAG 2.2 AA, known limitations and how to report a problem.", alternates: { canonical: "/accessibility" } };

export default function AccessibilityPage() {
  return (
    <ArticleLayout
      crumbs={[{ href: "/accessibility", label: "Accessibility" }]}
      title="Accessibility statement"
      description="We want everyone to be able to use this site, including people who use screen readers, keyboards or magnification."
      updated="2026-10-24"
      path="/accessibility"
      sources={[{ title: "Web Content Accessibility Guidelines (WCAG) 2.2", url: "https://www.w3.org/TR/WCAG22/" }]}
    >
      <h2>What we do</h2>
      <ul>
        <li>Semantic HTML with landmarks, a skip link and logical headings.</li>
        <li>Everything works with a keyboard, with visible focus indicators. Press <kbd>/</kbd> to jump to search.</li>
        <li>Text and controls meet WCAG 2.2 AA contrast in light and dark themes.</li>
        <li>Every chart has a data table and a text description; colour is never the only signal.</li>
        <li>Maps have an equivalent list of schools.</li>
        <li>Animations respect the &ldquo;reduce motion&rdquo; setting.</li>
        <li>Automated accessibility checks (axe) run in our test suite on key pages.</li>
      </ul>
      <h2>Known limitations</h2>
      <ul>
        <li>The interactive map is not fully usable with a screen reader; the list view has the same information.</li>
        <li>Linked official PDFs are published by schools and councils and may not be accessible.</li>
      </ul>
      <h2>Report a problem</h2>
      <p>Use the corrections form to tell us about an accessibility problem. We aim to respond within 5 working days.</p>
    </ArticleLayout>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/lib/site";
import { JsonLd } from "@/ui/json-ld";
import { SiteFooter } from "@/ui/site-footer";
import { SiteHeader } from "@/ui/site-header";
import { Sky } from "@/ui/sky";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — UK grammar schools, admissions and the 11+ explained`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { type: "website", siteName: SITE.name, locale: "en_GB" },
  twitter: { card: "summary" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#c9ecd9",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="relative min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[90] focus:rounded-[5px] focus:bg-green focus:px-4 focus:py-3 focus:font-semibold focus:text-paper"
        >
          Skip to main content
        </a>
        <Sky />
        <SiteHeader />
        <main id="main" tabIndex={-1} className="relative z-[1] outline-none">
          {children}
        </main>
        <SiteFooter />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE.name,
            url: SITE.url,
            potentialAction: { "@type": "SearchAction", target: `${SITE.url}/grammar-schools?q={search_term_string}`, "query-input": "required name=search_term_string" },
          }}
        />
      </body>
    </html>
  );
}

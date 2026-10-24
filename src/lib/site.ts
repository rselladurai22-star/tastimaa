/** Public site configuration. Safe to import from client components. */
export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Grammar Atlas",
  // On Vercel, fall back to the project's production domain so canonical URLs never point at localhost.
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
  ).replace(/\/$/, ""),
  description:
    "Verified information on every UK grammar school: entrance tests, admission rules, catchment, results and inspection outcomes, with a source for every fact.",
  contactEmail: "corrections@example.com",
};

export const PRIMARY_NAV = [
  { href: "/grammar-schools", label: "Find schools" },
  { href: "/tools/eligibility-checker", label: "Check eligibility" },
  { href: "/compare", label: "Compare" },
  { href: "/11-plus", label: "11+ exams" },
  { href: "/admissions", label: "Admissions guide" },
  { href: "/calendar", label: "Key dates" },
] as const;

export function absoluteUrl(path: string): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

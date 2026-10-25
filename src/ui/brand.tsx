import Link from "next/link";
import { SITE } from "@/lib/site";

/**
 * The Atlas mark: an open book seen from above whose pages carry contour lines
 * meeting at the spine — a map of knowledge. Drawn for 24–40px.
 */
export function AtlasMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <path d="M16 8.5C12.2 6 8 5.4 3.5 6v18c4.5-.6 8.7 0 12.5 2.5 3.8-2.5 8-3.1 12.5-2.5V6c-4.5-.6-8.7 0-12.5 2.5Z" strokeWidth="1.6" strokeLinejoin="round" style={{ fill: "var(--card)", stroke: "var(--green)" }} />
      <path d="M6.5 11.2c2.9-.3 5.6.3 7.6 1.6M6.5 15.4c2.9-.3 5.6.3 7.6 1.6M6.5 19.6c2.9-.3 5.6.3 7.6 1.6" fill="none" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" style={{ stroke: "var(--green)" }} />
      <path d="M25.5 11.2c-2.9-.3-5.6.3-7.6 1.6M25.5 15.4c-2.9-.3-5.6.3-7.6 1.6" fill="none" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" style={{ stroke: "var(--green)" }} />
      <path d="M16 8.5v18" strokeWidth="1.6" style={{ stroke: "var(--copper)" }} />
      <circle cx="21.6" cy="20.2" r="1.9" style={{ fill: "var(--copper)" }} />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5 rounded-[3px] text-ink no-underline" aria-label={`${SITE.name} — home`}>
      <AtlasMark size={compact ? 24 : 28} className="shrink-0 transition-transform duration-[var(--d-3)] ease-[var(--ease-out)] group-hover:-rotate-3" />
      <span className="font-display text-[1.5rem] leading-none font-normal tracking-[-1px] whitespace-nowrap text-green">
        Grammar Atlas
      </span>
    </Link>
  );
}

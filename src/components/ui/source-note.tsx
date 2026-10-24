import { ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { SourceRef } from "@/server/profile";
import { VerificationBadge, type Verification } from "./verification";

/** Inline citation shown under a fact or table. */
export function SourceNote({
  source,
  locator,
  status,
  checkedAt,
  prefix = "Source",
}: {
  source?: SourceRef | null;
  locator?: string | null;
  status?: Verification | string | null;
  checkedAt?: Date | string | null;
  prefix?: string;
}) {
  if (!source) {
    return (
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <VerificationBadge status="unavailable" /> No official source is recorded for this item.
      </p>
    );
  }
  const isExternal = /^https?:/.test(source.url);
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
      {status ? <VerificationBadge status={status} /> : null}
      <span>
        {prefix}:{" "}
        {isExternal ? (
          <a href={source.url} className="link" rel="noopener noreferrer" target="_blank">
            {source.title}
            <ExternalLink aria-hidden className="ml-0.5 inline size-3 align-[-1px]" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          source.title
        )}
        {source.publisher ? `, ${source.publisher}` : ""}
        {locator ? ` — ${locator}` : ""}. Retrieved {formatDate(source.retrievedAt)}
        {checkedAt ? `; last checked ${formatDate(checkedAt instanceof Date ? checkedAt.toISOString() : checkedAt)}` : ""}.
      </span>
    </p>
  );
}

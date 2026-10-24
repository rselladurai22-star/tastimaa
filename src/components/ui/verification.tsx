import { AlertTriangle, BadgeCheck, CircleDashed, CircleSlash, Clock, History, Sigma } from "lucide-react";
import { clsx } from "clsx";

export type Verification = "officially_verified" | "awaiting_verification" | "historical" | "estimated" | "unavailable" | "conflicting";

export const VERIFICATION_META: Record<Verification, { label: string; description: string; className: string; Icon: typeof BadgeCheck }> = {
  officially_verified: {
    label: "Official source",
    description: "Taken directly from an official publication, or checked against one by an editor.",
    className: "bg-ok-soft text-ok",
    Icon: BadgeCheck,
  },
  awaiting_verification: {
    label: "Awaiting verification",
    description: "Collected from the cited source but not yet checked by an editor. Always confirm with the school or council.",
    className: "bg-warn-soft text-warn",
    Icon: Clock,
  },
  historical: { label: "Historical", description: "Correct for an earlier period; may no longer apply.", className: "bg-info-soft text-info", Icon: History },
  estimated: { label: "Estimate", description: "Calculated by us from official data, using the method described.", className: "bg-info-soft text-info", Icon: Sigma },
  unavailable: { label: "Not available", description: "We could not obtain this from an official source. We do not guess.", className: "bg-neutral-soft text-ink-2", Icon: CircleSlash },
  conflicting: { label: "Sources conflict", description: "Official sources disagree. An editor is reviewing which is correct.", className: "bg-bad-soft text-bad", Icon: AlertTriangle },
};

export function VerificationBadge({ status, compact = false, className }: { status: Verification | string; compact?: boolean; className?: string }) {
  const meta = VERIFICATION_META[status as Verification] ?? { label: status, description: "", className: "bg-neutral-soft text-ink-2", Icon: CircleDashed };
  const { Icon } = meta;
  return (
    <span
      className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", meta.className, className)}
      title={meta.description}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {compact ? <span className="sr-only">{meta.label}</span> : meta.label}
    </span>
  );
}

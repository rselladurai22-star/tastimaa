import { clsx } from "clsx";
import { IconAbsent, IconConflict, IconEstimate, IconHistory, IconPending, IconSeal } from "./icons";

export type Verification = "officially_verified" | "awaiting_verification" | "historical" | "estimated" | "unavailable" | "conflicting";

/** What each verification state means. Shown in tooltips, legends and the methodology. */
export const VERIFICATION_META: Record<Verification, { label: string; description: string; tone: string; Icon: typeof IconSeal }> = {
  officially_verified: {
    label: "Official source",
    description: "Taken directly from an official publication, or checked against one by an editor.",
    tone: "bg-ok-wash text-ok",
    Icon: IconSeal,
  },
  awaiting_verification: {
    label: "Awaiting verification",
    description: "Collected from the cited source but not yet checked by an editor. Always confirm with the school or council.",
    tone: "bg-pend-wash text-pend",
    Icon: IconPending,
  },
  historical: { label: "Historical", description: "Correct for an earlier period; may no longer apply.", tone: "bg-info-wash text-info", Icon: IconHistory },
  estimated: { label: "Estimate", description: "Calculated by us from official data, using the method described.", tone: "bg-info-wash text-info", Icon: IconEstimate },
  unavailable: { label: "Not available", description: "We could not obtain this from an official source. We do not guess.", tone: "bg-none-wash text-none", Icon: IconAbsent },
  conflicting: { label: "Sources conflict", description: "Official sources disagree. An editor is reviewing which is correct.", tone: "bg-bad-wash text-bad", Icon: IconConflict },
};

/** Verification chip: icon + words, never colour alone. */
export function Status({ status, quiet = false, className }: { status: Verification | string; quiet?: boolean; className?: string }) {
  const meta = VERIFICATION_META[status as Verification] ?? { label: String(status).replace(/_/g, " "), description: "", tone: "bg-none-wash text-none", Icon: IconAbsent };
  const { Icon } = meta;
  return (
    <span
      title={meta.description}
      className={clsx(
        "inline-flex items-center gap-1.5 text-[0.875rem] leading-none font-semibold whitespace-nowrap",
        quiet ? meta.tone.split(" ").find((c) => c.startsWith("text-")) : clsx("rounded-[3px] px-2 py-[5px]", meta.tone),
        className,
      )}
    >
      <Icon size={15} className="shrink-0" />
      {meta.label}
    </span>
  );
}

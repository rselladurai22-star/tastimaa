"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrow } from "../icons";
import { controlClass } from "../kit";
import { useShortlist } from "../shortlist";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await fetch("/api/auth/magic-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        const j = await res.json().catch(() => ({}));
        setMsg(j.message ?? j.error ?? "Something went wrong.");
      }}
      className="grid max-w-md gap-2"
    >
      <label htmlFor="acc-email" className="font-semibold text-ink">
        Email address
      </label>
      <div className="flex gap-2">
        <input id="acc-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={controlClass} />
        <button className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[5px] bg-green px-4 font-semibold text-paper hover:bg-green-deep">
          Email me a sign-in link
        </button>
      </div>
      {msg ? (
        <p role="status" className="text-[0.98rem] text-ink">
          {msg}
        </p>
      ) : null}
    </form>
  );
}

export function SavedSchools({ initial }: { initial: { slug: string; name: string }[] }) {
  const { list } = useShortlist();
  const [saved, setSaved] = useState(initial);
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const unsynced = list.filter((l) => !saved.some((s) => s.slug === l.slug));
  return (
    <div className="grid gap-8">
      <section aria-labelledby="acc-saved">
        <h2 id="acc-saved" className="text-h3">
          Saved schools
        </h2>
        {saved.length ? (
          <ul className="mt-4 border-t border-rule">
            {saved.map((s) => (
              <li key={s.slug} className="border-b border-rule">
                <Link href={`/schools/${s.slug}`} className="group/sv flex items-center justify-between py-3 font-semibold text-ink no-underline hover:text-green">
                  {s.name}
                  <IconArrow size={16} className="text-ink-3 transition-transform duration-[var(--d-2)] group-hover/sv:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-ink-2">No saved schools yet.</p>
        )}
        {unsynced.length ? (
          <button
            type="button"
            onClick={async () => {
              const res = await fetch("/api/account/saved", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slugs: list.map((l) => l.slug) }) });
              if (res.ok) setSaved((await res.json()).saved);
            }}
            className="mt-4 inline-flex min-h-11 items-center rounded-[5px] border border-control bg-card px-4 font-semibold text-ink hover:border-ink"
          >
            Save {unsynced.length} shortlisted {unsynced.length === 1 ? "school" : "schools"} from this browser to your account
          </button>
        ) : null}
      </section>
      <section aria-labelledby="acc-delete" className="rounded-[8px] border border-bad/30 bg-bad-wash/40 p-5">
        <h2 id="acc-delete" className="text-h4 text-ink">
          Delete account
        </h2>
        <p className="mt-1 text-ink-2">Deletes your account, saved schools and reminder subscriptions immediately. This can&apos;t be undone.</p>
        <button
          type="button"
          disabled={deleting}
          onClick={async () => {
            if (!window.confirm("Delete your account and all saved data now?")) return;
            setDeleting(true);
            const res = await fetch("/api/account/saved", { method: "DELETE" });
            if (res.ok) {
              router.replace("/account?deleted=1");
              router.refresh();
            } else setDeleting(false);
          }}
          className="mt-4 inline-flex min-h-11 items-center rounded-[5px] border border-bad bg-card px-4 font-semibold text-bad hover:bg-bad hover:text-paper disabled:opacity-60"
        >
          Delete my account
        </button>
      </section>
    </div>
  );
}

export function CorrectionForm({ school, schoolName, page }: { school?: string | null; schoolName?: string | null; page?: string | null }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    const res = await fetch("/api/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school: school ?? null, page: page ?? undefined, field: f.get("field"), correction: f.get("correction"), sourceUrl: f.get("sourceUrl") || "", email: f.get("email") || "", website: f.get("website") || "" }),
    });
    if (res.ok) setState("sent");
    else {
      setState("error");
      setError((await res.json().catch(() => ({}))).error ?? "Something went wrong.");
    }
  }
  if (state === "sent")
    return (
      <p className="anim-rise rounded-[6px] border border-ok/30 bg-ok-wash p-5 font-semibold text-ok" role="status">
        Thank you. An editor will check your correction against the official source.
      </p>
    );
  const field = "grid gap-1.5";
  const lbl = "font-semibold text-ink";
  return (
    <form onSubmit={submit} className="grid max-w-2xl gap-6">
      {schoolName ? (
        <p className="border-l-2 border-copper pl-4 text-ink-2">
          About: <strong className="text-ink">{schoolName}</strong>
        </p>
      ) : null}
      <div className={field}>
        <label htmlFor="cf-field" className={lbl}>
          What is wrong or missing?
        </label>
        <input id="cf-field" name="field" required minLength={2} maxLength={200} placeholder="e.g. Published admission number for 2027" className={controlClass} />
      </div>
      <div className={field}>
        <label htmlFor="cf-correction" className={lbl}>
          What should it say?
        </label>
        <textarea id="cf-correction" name="correction" required minLength={10} maxLength={3000} rows={5} className={`${controlClass} py-2.5`} />
      </div>
      <div className={field}>
        <label htmlFor="cf-source" className={lbl}>
          Link to the official source <span className="font-normal text-ink-2">(strongly recommended)</span>
        </label>
        <input id="cf-source" name="sourceUrl" type="url" placeholder="https://" className={controlClass} />
      </div>
      <div className={field}>
        <label htmlFor="cf-email" className={lbl}>
          Your email <span className="font-normal text-ink-2">(optional, only to follow up)</span>
        </label>
        <input id="cf-email" name="email" type="email" autoComplete="email" className={controlClass} />
      </div>
      <div className="hidden" aria-hidden>
        <label htmlFor="cf-website">Website</label>
        <input id="cf-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state === "error" ? (
        <p className="font-semibold text-bad" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={state === "sending"} className="inline-flex min-h-11 items-center justify-self-start rounded-[5px] bg-green px-5 font-semibold text-paper hover:bg-green-deep disabled:opacity-60">
        {state === "sending" ? "Sending…" : "Send correction"}
      </button>
    </form>
  );
}

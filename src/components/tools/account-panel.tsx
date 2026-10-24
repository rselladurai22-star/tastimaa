"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useShortlist } from "@/components/school/shortlist";

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
      className="grid max-w-md gap-3"
    >
      <label htmlFor="acc-email" className="text-sm font-semibold">
        Email address
      </label>
      <input id="acc-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-line-strong bg-surface px-3 py-2" />
      <button className="justify-self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white dark:text-[#0f1112]">Email me a sign-in link</button>
      {msg ? (
        <p role="status" className="text-sm text-ink-2">
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
    <div className="grid gap-6">
      <div>
        <h2 className="text-xl font-semibold">Saved schools</h2>
        {saved.length ? (
          <ul className="mt-3 grid gap-1.5">
            {saved.map((s) => (
              <li key={s.slug}>
                <Link href={`/schools/${s.slug}`} className="link">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-2">No saved schools yet.</p>
        )}
        {unsynced.length ? (
          <button
            type="button"
            onClick={async () => {
              const res = await fetch("/api/account/saved", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slugs: list.map((l) => l.slug) }) });
              if (res.ok) setSaved((await res.json()).saved);
            }}
            className="mt-3 rounded-lg border border-line-strong px-3 py-2 text-sm font-medium"
          >
            Save {unsynced.length} shortlisted {unsynced.length === 1 ? "school" : "schools"} from this browser to your account
          </button>
        ) : null}
      </div>
      <div className="border-t border-line pt-6">
        <h2 className="text-xl font-semibold">Delete account</h2>
        <p className="mt-1 text-sm text-ink-2">Deletes your account, saved schools and reminder subscriptions immediately. This can&apos;t be undone.</p>
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
            }
            else setDeleting(false);
          }}
          className="mt-3 rounded-lg border border-bad/40 px-3 py-2 text-sm font-semibold text-bad"
        >
          Delete my account
        </button>
      </div>
    </div>
  );
}

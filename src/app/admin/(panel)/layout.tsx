import { requireRole } from "@/server/auth";
import { logoutAction } from "@/app/admin/actions";
import { ConsoleNav } from "@/ui/admin/console-nav";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin", "editor"]);
  return (
    <div className="grid min-h-[calc(100vh-var(--header-h))] lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="bg-green-deep px-3 py-4 text-paper lg:px-4 lg:py-6">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <p className="mb-4 hidden px-3 font-mono text-[0.75rem] tracking-[0.08em] text-paper/70 uppercase lg:block">Data console</p>
          <ConsoleNav />
          <form action={logoutAction} className="mt-6 hidden border-t border-paper/15 px-3 pt-4 lg:block">
            <p className="text-small break-all text-paper/80">{user.email}</p>
            <p className="font-mono text-[0.75rem] text-copper uppercase">{user.role}</p>
            <button type="submit" className="mt-3 inline-flex min-h-9 items-center rounded-[4px] border border-paper/30 px-3 text-small font-semibold text-paper hover:bg-paper/10">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 bg-paper">
        <form action={logoutAction} className="flex items-center justify-between gap-3 border-b border-rule px-5 py-2 text-small lg:hidden">
          <span className="truncate text-ink-2">
            {user.email} · {user.role}
          </span>
          <button type="submit" className="inline-flex min-h-9 items-center rounded-[4px] border border-control px-3 font-semibold text-ink">
            Sign out
          </button>
        </form>
        <div className="px-5 py-8 sm:px-8 lg:px-10">{children}</div>
      </div>
    </div>
  );
}

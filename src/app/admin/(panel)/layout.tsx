import Link from "next/link";
import { requireRole } from "@/server/auth";
import { logoutAction } from "@/app/admin/actions";
import { Container } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const NAV = [
  ["/admin", "Dashboard"],
  ["/admin/review", "Review queue"],
  ["/admin/runs", "Ingestion runs"],
  ["/admin/documents", "Documents"],
  ["/admin/schools", "Schools"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin", "editor"]);
  return (
    <div className="min-h-screen bg-surface-2/40">
      <div className="border-b border-line bg-surface">
        <Container className="flex flex-wrap items-center gap-4 py-3">
          <p className="font-semibold">Data console</p>
          <nav aria-label="Admin" className="flex flex-wrap gap-1 text-sm">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href!} className="rounded-md px-2.5 py-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink">
                {label}
              </Link>
            ))}
          </nav>
          <form action={logoutAction} className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-ink-3">
              {user.email} · {user.role}
            </span>
            <button type="submit" className="rounded-md border border-line px-2.5 py-1.5 hover:bg-surface-2">
              Sign out
            </button>
          </form>
        </Container>
      </div>
      <Container className="py-8">{children}</Container>
    </div>
  );
}

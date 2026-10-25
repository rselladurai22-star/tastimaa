import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser } from "@/server/auth";
import { PageHero } from "@/ui/hero";
import { Note, Page } from "@/ui/kit";
import { SavedSchools, SignInForm } from "@/ui/tools/account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string; signedin?: string }> }) {
  const sp = await searchParams;
  const user = await currentUser();
  const saved = user
    ? await db().select({ slug: schema.schools.slug, name: schema.schools.name }).from(schema.savedSchools).innerJoin(schema.schools, eq(schema.schools.id, schema.savedSchools.schoolId)).where(eq(schema.savedSchools.userId, user.id))
    : [];
  return (
    <>
      <PageHero
        crumbs={[{ href: "/account", label: "Your account" }]}
        kicker="The atlas"
        title="Your account"
        lede={user ? `Signed in as ${user.email}.` : "You don't need an account to use any tool. Sign in only if you want your shortlist saved across devices. We store just your email address and the schools you save."}
      />
      <Page className="pt-4 pb-16">
        <div className="max-w-[44rem]">
          {sp.deleted ? <Note className="mb-6">Your account and saved data have been deleted.</Note> : null}
          {sp.error === "link" ? (
            <Note tone="caution" className="mb-6">
              That sign-in link has expired or was already used. Request a new one.
            </Note>
          ) : null}
          {user ? <SavedSchools initial={saved} /> : <SignInForm />}
        </div>
      </Page>
    </>
  );
}

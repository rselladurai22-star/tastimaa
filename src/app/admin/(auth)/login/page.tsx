import type { Metadata } from "next";
import { Kicker, Page } from "@/ui/kit";
import { LoginForm } from "@/ui/admin/login-form";

export const metadata: Metadata = { title: "Editor sign in", robots: { index: false, follow: false } };

export default function AdminLogin() {
  return (
    <Page className="grid place-items-center pt-16 pb-24">
      <div className="w-full max-w-[26rem] rounded-[8px] border border-rule bg-card p-6 sm:p-8">
        <Kicker>Data console</Kicker>
        <h1 className="mt-3 text-h2">Editor sign in</h1>
        <p className="mt-2 mb-6 text-ink-2">For the data team only. Parents don&apos;t need an account to use the site.</p>
        <LoginForm />
      </div>
    </Page>
  );
}

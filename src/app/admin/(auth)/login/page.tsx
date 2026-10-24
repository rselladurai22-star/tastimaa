import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Editor sign in", robots: { index: false, follow: false } };

export default function AdminLogin() {
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-2xl font-semibold">Editor sign in</h1>
      <p className="mt-2 mb-6 text-sm text-ink-2">For the data team only. Parents don&apos;t need an account to use the site.</p>
      <LoginForm />
    </Container>
  );
}

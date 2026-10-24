"use client";

import { Container } from "@/components/ui/primitives";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="max-w-2xl py-20">
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-ink-2">This page couldn&apos;t be loaded. The problem has been logged. Please try again.</p>
      <button type="button" onClick={reset} className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white dark:text-[#0f1112]">
        Try again
      </button>
    </Container>
  );
}

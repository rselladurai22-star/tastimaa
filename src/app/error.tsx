"use client";

import Link from "next/link";
import { Kicker, Page } from "@/ui/kit";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Page className="max-w-[44rem] pt-12 pb-16">
      <Kicker>Something went wrong</Kicker>
      <h1 className="mt-4 text-h1">This page couldn&apos;t be loaded</h1>
      <p className="mt-4 text-lede leading-[1.5] text-ink">The problem has been logged. Please try again.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="inline-flex min-h-11 items-center rounded-[5px] bg-green px-4 font-semibold text-paper hover:bg-green-deep">
          Try again
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-[5px] border border-control bg-card px-4 font-semibold text-ink no-underline hover:border-ink">
          Go to the homepage
        </Link>
      </div>
    </Page>
  );
}

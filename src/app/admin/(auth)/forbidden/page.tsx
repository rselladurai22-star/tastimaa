import { Kicker, Page } from "@/ui/kit";

export const metadata = { title: "Not permitted", robots: { index: false, follow: false } };

export default function Forbidden() {
  return (
    <Page className="max-w-[40rem] pt-16 pb-24">
      <Kicker>Data console</Kicker>
      <h1 className="mt-3 text-h2">You don&apos;t have access to this area</h1>
      <p className="mt-2 text-ink-2">Ask an administrator to grant your account the editor role.</p>
    </Page>
  );
}

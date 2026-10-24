import { Container } from "@/components/ui/primitives";

export const metadata = { title: "Not permitted", robots: { index: false, follow: false } };

export default function Forbidden() {
  return (
    <Container className="max-w-xl py-16">
      <h1 className="text-2xl font-semibold">You don&apos;t have access to this area</h1>
      <p className="mt-2 text-ink-2">Ask an administrator to grant your account the editor role.</p>
    </Container>
  );
}

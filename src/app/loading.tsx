import { Container } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <Container className="py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="h-8 w-72 animate-pulse rounded bg-surface-3" />
      <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded bg-surface-3" />
      <div className="mt-2 h-4 w-full max-w-xl animate-pulse rounded bg-surface-3" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-xl border border-line bg-surface" />
        ))}
      </div>
    </Container>
  );
}

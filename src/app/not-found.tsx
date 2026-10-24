import Link from "next/link";
import { SearchBox } from "@/components/search/search-box";
import { Container } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <Container className="max-w-2xl py-20">
      <p className="text-sm font-semibold text-accent-ink">404</p>
      <h1 className="mt-2 text-3xl font-semibold">We can&apos;t find that page</h1>
      <p className="mt-3 text-ink-2">The school may have changed its name or closed, or the link may be mistyped. Try searching:</p>
      <div className="mt-6">
        <SearchBox />
      </div>
      <p className="mt-6 text-sm">
        <Link href="/grammar-schools" className="link">
          Browse all grammar schools
        </Link>
      </p>
    </Container>
  );
}

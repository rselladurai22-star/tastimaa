import Link from "next/link";
import { Hero, HeroHead } from "@/ui/hero";
import { ArrowLink, Page } from "@/ui/kit";
import { SearchField } from "@/ui/search";

export default function NotFound() {
  return (
    <>
      <Hero>
        <HeroHead kicker="404 · Off the map" title="We can't find that page" lede="The school may have changed its name or closed, or the link may be mistyped. Try searching:">
          <div className="on-light mt-6 rounded-[14px] bg-card p-2 shadow-[0_20px_40px_-20px_rgb(0_0_0/0.6)]">
            <SearchField placeholder="School, town or postcode" />
          </div>
        </HeroHead>
      </Hero>
      <Page className="flex flex-col gap-2 pt-4 pb-24">
        <ArrowLink href="/grammar-schools">Browse all grammar schools</ArrowLink>
        <ArrowLink href="/admissions">How admissions work</ArrowLink>
        <p className="sr-only">
          <Link href="/">Return to the homepage</Link>
        </p>
      </Page>
    </>
  );
}

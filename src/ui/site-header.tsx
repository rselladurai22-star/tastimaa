import { navData } from "@/server/nav";
import { Wordmark } from "./brand";
import { MainNav, MobileNav } from "./main-nav";
import { SearchDialogTrigger } from "./search";
import { ShortlistCount } from "./shortlist";

export async function SiteHeader() {
  const data = await navData();
  return (
    <header data-site-header className="site-header sticky top-0 z-40">
      <div className="container-page flex h-[var(--header-h)] items-center gap-4 lg:gap-8">
        <Wordmark />
        <MainNav data={data} />
        <div className="ml-auto flex items-center gap-2">
          <SearchDialogTrigger />
          <ShortlistCount />
          <MobileNav data={data} />
        </div>
      </div>
    </header>
  );
}

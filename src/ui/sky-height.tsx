/**
 * A deep navy band for the top of a page, menu included: white type on the
 * band, and the usual light header once the page scrolls. Menu panels keep
 * their light colours.
 */
export function NightSky() {
  return (
    <style>{`:root{--sky:linear-gradient(165deg,#0b1033 0%,#141a4d 45%,#1f2a78 100%);--sky-cloud:#26318a}
html:not([data-scrolled]) .site-header{--ink:#ffffff;--ink-2:#dfe3f5;--green:#ffffff}
.site-header [data-nav-panel]{--ink:#0a0c10;--ink-2:#262d40;--green:#4242fa}`}</style>
  );
}

/** Lets a page set how far the sky band reaches (mobile, then from 1024px up). */
export function SkyHeight({ mobile, desktop }: { mobile: string; desktop: string }) {
  return <style>{`:root{--sky-h:${mobile}}@media (min-width:1024px){:root{--sky-h:${desktop}}}`}</style>;
}

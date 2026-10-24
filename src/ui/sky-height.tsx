/** Lets a page set how far the sky band reaches (mobile, then from 1024px up). */
export function SkyHeight({ mobile, desktop }: { mobile: string; desktop: string }) {
  return <style>{`:root{--sky-h:${mobile}}@media (min-width:1024px){:root{--sky-h:${desktop}}}`}</style>;
}

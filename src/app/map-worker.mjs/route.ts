import { readFile } from "node:fs/promises";
import { join } from "node:path";

// MapLibre resolves its web worker next to its own module, which no longer
// exists once the library is bundled. Serve the worker from the package at a
// fixed URL instead; it is read once at build time.
export const dynamic = "force-static";

export async function GET() {
  const body = await readFile(join(process.cwd(), "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs"), "utf8");
  return new Response(body, {
    headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}

import { NextResponse } from "next/server";
import { rateLimit } from "@/server/rate-limit";
import { suggest } from "@/server/schools";

export async function GET(req: Request) {
  const limited = await rateLimit(req, "suggest", 120, 60);
  if (limited) return limited;
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 80) ?? "";
  try {
    const suggestions = await suggest(q);
    return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
  } catch {
    return NextResponse.json({ suggestions: [], error: "Search is temporarily unavailable" }, { status: 503 });
  }
}

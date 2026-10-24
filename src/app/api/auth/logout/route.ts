import { NextResponse } from "next/server";
import { destroySession, sameOrigin } from "@/server/auth";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await destroySession();
  return NextResponse.json({ ok: true });
}

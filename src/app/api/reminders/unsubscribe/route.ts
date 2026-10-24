import { NextResponse } from "next/server";
import { unsubscribe } from "@/server/reminders";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok = token ? await unsubscribe(token) : false;
  return NextResponse.redirect(new URL(`/tools/planner?reminders=${ok ? "unsubscribed" : "invalid"}`, req.url));
}

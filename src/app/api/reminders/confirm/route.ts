import { NextResponse } from "next/server";
import { confirm } from "@/server/reminders";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok = token ? await confirm(token) : false;
  return NextResponse.redirect(new URL(`/tools/planner?reminders=${ok ? "confirmed" : "invalid"}`, req.url));
}

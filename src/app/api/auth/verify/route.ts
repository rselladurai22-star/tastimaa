import { NextResponse } from "next/server";
import { consumeLoginToken } from "@/server/auth";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const userId = token ? await consumeLoginToken(token) : null;
  return NextResponse.redirect(new URL(userId ? "/account?signedin=1" : "/account?error=link", req.url));
}

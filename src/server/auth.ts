import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import { db, schema } from "@/db";
import { env } from "@/lib/env";

/**
 * Session auth. The session token lives only in an HttpOnly cookie; the
 * database stores its SHA-256 hash, so a database leak cannot be replayed.
 */
const COOKIE = "gsi_session";
const SESSION_DAYS = 30;
const LOGIN_TOKEN_MINUTES = 20;

export type Role = "parent" | "editor" | "admin";
export interface SessionUser {
  id: number;
  email: string;
  displayName: string | null;
  role: Role;
}

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

export async function hashPassword(pw: string) {
  return argonHash(pw, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(hashValue: string, pw: string) {
  try {
    return await argonVerify(hashValue, pw);
  } catch {
    return false;
  }
}

export async function createSession(userId: number) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db().insert(schema.sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  await db().update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, userId));
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: env().NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db().delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token)));
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<SessionUser | null> {
  let token: string | undefined;
  try {
    token = (await cookies()).get(COOKIE)?.value;
  } catch {
    return null; // called outside a request scope
  }
  if (!token) return null;
  const [row] = await db()
    .select({ id: schema.users.id, email: schema.users.email, displayName: schema.users.displayName, role: schema.users.role })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, hashToken(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

/** Use in admin layouts/pages/actions. Editors can review; only admins manage users and publishing of sources. */
export async function requireRole(roles: Role[], loginPath = "/admin/login"): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect(loginPath);
  if (!roles.includes(user.role)) redirect("/admin/forbidden");
  return user;
}

export async function passwordLogin(email: string, password: string): Promise<SessionUser | null> {
  const user = await db().query.users.findFirst({ where: eq(schema.users.email, email.trim().toLowerCase()) });
  // Always run a verification to keep timing similar for unknown emails.
  const ok = await verifyPassword(user?.passwordHash ?? "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0$0000000000000000000000000000000000000000000", password);
  if (!user || !user.passwordHash || !ok || user.role === "parent") return null;
  await createSession(user.id);
  return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
}

/** Create a single-use magic-link token for a parent account. */
export async function createLoginToken(email: string): Promise<string> {
  const token = newToken();
  await db().insert(schema.loginTokens).values({ tokenHash: hashToken(token), email: email.trim().toLowerCase(), expiresAt: new Date(Date.now() + LOGIN_TOKEN_MINUTES * 60_000) });
  return token;
}

export async function consumeLoginToken(token: string): Promise<number | null> {
  const th = hashToken(token);
  const row = await db().query.loginTokens.findFirst({ where: and(eq(schema.loginTokens.tokenHash, th), isNull(schema.loginTokens.usedAt), gt(schema.loginTokens.expiresAt, new Date())) });
  if (!row) return null;
  await db().update(schema.loginTokens).set({ usedAt: new Date() }).where(eq(schema.loginTokens.tokenHash, th));
  let user = await db().query.users.findFirst({ where: eq(schema.users.email, row.email) });
  if (!user) {
    const [created] = await db().insert(schema.users).values({ email: row.email, role: "parent", emailVerifiedAt: new Date() }).returning();
    user = created!;
  } else if (!user.emailVerifiedAt) {
    await db().update(schema.users).set({ emailVerifiedAt: new Date() }).where(eq(schema.users.id, user.id));
  }
  await createSession(user.id);
  return user.id;
}

/** Reject cross-site state-changing requests to JSON route handlers. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

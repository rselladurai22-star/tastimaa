import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Transactional email via Resend's HTTP API. Without RESEND_API_KEY the email
 * is logged instead (development), never silently dropped.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<{ sent: boolean }> {
  const key = env().RESEND_API_KEY;
  if (!key) {
    logger.info("email (not sent: RESEND_API_KEY missing)", { to: to.replace(/^(.).*(@.*)$/, "$1***$2"), subject, text: env().NODE_ENV === "production" ? undefined : text });
    return { sent: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env().EMAIL_FROM, to: [to], subject, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    logger.error("email send failed", { status: res.status, subject });
    return { sent: false };
  }
  return { sent: true };
}

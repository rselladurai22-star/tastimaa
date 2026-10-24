import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

/** Argon2id with OWASP's minimum recommended cost. Kept free of Next.js imports so CLI scripts can use it. */
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

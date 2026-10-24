import { createHash, randomBytes } from "node:crypto";

/** Opaque tokens are stored only as SHA-256 hashes (sessions, magic links, reminder links). */
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

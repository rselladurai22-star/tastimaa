import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Object storage for authorised source documents. The default driver writes
 * to the local filesystem; swap `putObject`/`getObject` for an S3-compatible
 * client in production (see docs/DEPLOYMENT.md).
 */
let warned = false;

/** Vercel functions can only write under /tmp, so a configured directory elsewhere is ignored there. */
export function storageRoot(): string {
  const dir = env().STORAGE_DIR;
  if (process.env.VERCEL && !dir.startsWith("/tmp/")) {
    if (!warned) logger.warn("STORAGE_DIR is not writable on Vercel; using /tmp/grammar-atlas", { configured: dir });
    warned = true;
    return "/tmp/grammar-atlas";
  }
  return dir;
}

function resolveKey(key: string): string {
  const clean = normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  if (clean.startsWith("/") || clean.includes("..")) throw new Error("Invalid storage key");
  // Runtime data directory, never part of the deployed bundle.
  return join(/*turbopackIgnore: true*/ storageRoot(), clean);
}

export async function putObject(key: string, body: Buffer): Promise<string> {
  const path = resolveKey(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
  return key;
}

export async function getObject(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

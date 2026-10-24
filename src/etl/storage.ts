import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { env } from "@/lib/env";

/**
 * Object storage for authorised source documents. The default driver writes
 * to the local filesystem; swap `putObject`/`getObject` for an S3-compatible
 * client in production (see docs/DEPLOYMENT.md).
 */
function resolveKey(key: string): string {
  const clean = normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  if (clean.startsWith("/") || clean.includes("..")) throw new Error("Invalid storage key");
  return join(env().STORAGE_DIR, clean);
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

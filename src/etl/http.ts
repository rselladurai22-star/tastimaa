import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface FetchOptions {
  /** Maximum number of attempts (including the first). */
  attempts?: number;
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Errors that are worth retrying: network failures, timeouts, 429 and 5xx. */
function retryable(err: unknown): boolean {
  if (err instanceof HttpError) return err.status === 429 || err.status >= 500;
  return true;
}

/**
 * Fetch with an identifying User-Agent, a timeout, a size cap and exponential
 * backoff (1s, 2s, 4s …). Returns the body as a Buffer.
 */
export async function fetchBuffer(url: string, opts: FetchOptions = {}): Promise<{ body: Buffer; contentType: string | null; finalUrl: string }> {
  const attempts = opts.attempts ?? 4;
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const maxBytes = opts.maxBytes ?? 250 * 1024 * 1024;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: opts.method ?? "GET",
        body: opts.body,
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": env().ETL_USER_AGENT, Accept: "*/*", ...opts.headers },
      });
      if (!res.ok) throw new HttpError(`HTTP ${res.status} for ${url}`, res.status, url);
      const declared = Number(res.headers.get("content-length") ?? "0");
      if (declared > maxBytes) throw new HttpError(`Response too large (${declared} bytes)`, 413, url);
      const body = Buffer.from(await res.arrayBuffer());
      if (body.byteLength > maxBytes) throw new HttpError(`Response too large (${body.byteLength} bytes)`, 413, url);
      return { body, contentType: res.headers.get("content-type"), finalUrl: res.url || url };
    } catch (err) {
      lastErr = err;
      if (!retryable(err) || attempt === attempts) break;
      const delay = 1000 * 2 ** (attempt - 1);
      logger.warn("fetch failed, retrying", { url, attempt, delay, error: err instanceof Error ? err.message : String(err) });
      await sleep(delay);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const { body } = await fetchBuffer(url, { ...opts, headers: { Accept: "application/json", ...opts.headers } });
  return JSON.parse(body.toString("utf8")) as T;
}

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const { body } = await fetchBuffer(url, opts);
  return body.toString("utf8");
}

export function sha256(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

/* ------------------------------------------------------------------ */
/* robots.txt + polite crawling for individual school documents        */
/* ------------------------------------------------------------------ */

const robotsCache = new Map<string, { rules: { allow: boolean; path: string }[]; crawlDelayMs: number }>();
const lastHit = new Map<string, number>();

/** Parse the rules that apply to our user agent (or `*`). Exported for tests. */
export function parseRobots(txt: string, agent: string): { rules: { allow: boolean; path: string }[]; crawlDelayMs: number } {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[]; delay?: number }[] = [];
  let current: (typeof groups)[number] | undefined;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      if (value === "" && key === "disallow") continue;
      current.rules.push({ allow: key === "allow", path: value });
    } else if (key === "crawl-delay") {
      const n = Number(value);
      if (Number.isFinite(n)) current.delay = n;
    }
  }
  const token = agent.toLowerCase().split("/")[0] ?? "";
  const specific = groups.find((g) => g.agents.some((a) => a !== "*" && token.includes(a)));
  const chosen = specific ?? groups.find((g) => g.agents.includes("*"));
  return { rules: chosen?.rules ?? [], crawlDelayMs: Math.max(1000, (chosen?.delay ?? 1) * 1000) };
}

/** Longest-match wins; ties go to Allow (per RFC 9309). Supports `*` and `$`. */
export function robotsAllows(rules: { allow: boolean; path: string }[], pathname: string): boolean {
  let best: { allow: boolean; len: number } | undefined;
  for (const r of rules) {
    const pattern = "^" + r.path.replace(/[.+?^${}()|[\]\\]/g, (c) => (c === "$" ? "$" : "\\" + c)).replace(/\*/g, ".*");
    const re = new RegExp(r.path.endsWith("$") ? pattern : pattern.replace(/\\\$$/, ""));
    if (re.test(pathname)) {
      if (!best || r.path.length > best.len || (r.path.length === best.len && r.allow)) best = { allow: r.allow, len: r.path.length };
    }
  }
  return best ? best.allow : true;
}

/**
 * Fetch a document from a third-party website (e.g. a school's admissions
 * policy PDF) only if robots.txt allows it, honouring a per-host delay.
 */
export async function politeFetch(url: string, opts: FetchOptions = {}) {
  const u = new URL(url);
  const agent = env().ETL_USER_AGENT;
  let robots = robotsCache.get(u.host);
  if (!robots) {
    try {
      const txt = await fetchText(`${u.protocol}//${u.host}/robots.txt`, { attempts: 2, timeoutMs: 15_000 });
      robots = parseRobots(txt, agent);
    } catch (err) {
      // 4xx → no robots file → allowed. Network failure → be conservative.
      if (err instanceof HttpError && err.status >= 400 && err.status < 500) robots = { rules: [], crawlDelayMs: 2000 };
      else throw new Error(`Could not read robots.txt for ${u.host}; not fetching`);
    }
    robotsCache.set(u.host, robots);
  }
  if (!robotsAllows(robots.rules, u.pathname)) {
    throw new HttpError(`robots.txt disallows ${u.pathname}`, 999, url);
  }
  const wait = (lastHit.get(u.host) ?? 0) + robots.crawlDelayMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(u.host, Date.now());
  return fetchBuffer(url, opts);
}

"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * A JSON value kept in this browser's localStorage. Server and hydration
 * renders see `fallback`, so there is no mismatch; when storage is blocked
 * (private mode) the value lives in memory for the visit. Pass a module-level
 * constant as `fallback` so its identity is stable.
 */
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function getRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useStoredJson<T>(key: string, fallback: T): [T, (next: T | null) => void] {
  const raw = useSyncExternalStore(subscribe, () => getRaw(key), () => null);
  const value = useMemo(() => {
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }, [raw, fallback]);
  const set = useCallback(
    (next: T | null) => {
      try {
        if (next === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage unavailable: memory only */
      }
      if (next === null) memory.delete(key);
      else memory.set(key, JSON.stringify(next));
      listeners.forEach((l) => l());
    },
    [key],
  );
  return [value, set];
}

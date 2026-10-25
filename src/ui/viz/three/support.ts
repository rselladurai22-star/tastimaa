"use client";

import { useSyncExternalStore } from "react";

/**
 * Feature checks for the 3D layer. Every 3D figure renders its flat SVG first
 * and only paints WebGL over it when the device can draw it, so the page reads
 * the same with scripts off, on old hardware or to a screen reader.
 */

let webgl: boolean | null = null;
function hasWebGL() {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement("canvas");
    webgl = !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    webgl = false;
  }
  return webgl;
}

const noop = () => () => {};

export function useWebGL() {
  return useSyncExternalStore(noop, hasWebGL, () => false);
}

const RM = "(prefers-reduced-motion: reduce)";
function subscribeMotion(cb: () => void) {
  const m = window.matchMedia(RM);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribeMotion, () => window.matchMedia(RM).matches, () => true);
}

/** Resolve a CSS custom property (e.g. "--green") as seen from an element. */
export function token(el: Element, name: string, fallback = "#888888") {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

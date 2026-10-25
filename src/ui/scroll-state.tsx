"use client";

import { useEffect } from "react";

/**
 * Marks the document as scrolled so the header can turn solid once it leaves
 * the top of the page (see `html[data-scrolled]` in globals.css).
 */
export function ScrollState() {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      if (window.scrollY > 24) root.dataset.scrolled = "";
      else delete root.dataset.scrolled;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return null;
}

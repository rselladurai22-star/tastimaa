"use client";

import { useEffect } from "react";

/**
 * The sky band at the top of every page, with two rows of clouds that fade
 * into the page. Also marks the document as scrolled so the header can
 * turn solid once it leaves the sky.
 */
export function Sky() {
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
  return (
    <div aria-hidden data-no-print className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[var(--sky-h)] overflow-hidden" style={{ background: "var(--sky)" }}>
      <svg className="absolute bottom-0 left-1/2 h-[7rem] w-[1100px] max-w-none -translate-x-1/2 sm:h-[10rem] sm:w-[1440px] lg:left-0 lg:h-[13rem] lg:w-full lg:translate-x-0" viewBox="0 0 1440 200" preserveAspectRatio="none">
        <path
          d="M0 120 C 90 70 210 70 290 105 C 350 40 520 30 600 95 C 690 50 820 60 860 110 C 930 30 1110 10 1190 85 C 1260 40 1380 55 1440 95 L1440 200 L0 200 Z"
          style={{ fill: "var(--sky-cloud)" }}
        />
        <path
          d="M0 165 C 120 125 260 130 330 160 C 420 105 600 100 690 150 C 760 120 860 125 900 150 C 990 95 1180 90 1260 140 C 1330 115 1400 120 1440 135 L1440 200 L0 200 Z"
          style={{ fill: "var(--paper)" }}
        />
      </svg>
    </div>
  );
}

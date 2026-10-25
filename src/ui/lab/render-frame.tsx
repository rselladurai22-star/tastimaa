"use client";

import dynamic from "next/dynamic";

const NeighbourhoodRender = dynamic(() => import("./neighbourhood-3d"), { ssr: false });

/** Fixed-size frame the still image for approach D is captured from. */
export function RenderFrame() {
  return (
    <div id="render-frame" className="h-[800px] w-[1280px]">
      <NeighbourhoodRender />
    </div>
  );
}

import type { Metadata } from "next";
import { RenderFrame } from "@/ui/lab/render-frame";

export const metadata: Metadata = { title: "Render frame", robots: { index: false, follow: false } };

export default function RenderPage() {
  return <RenderFrame />;
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapPoint {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  sub?: string;
}

export interface MapPolygon {
  name: string;
  geojson: GeoJSON.Geometry;
  note: string;
}

const STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/positron";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const token = (name: string, fallback: string) => (typeof window === "undefined" ? fallback : getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback);

/**
 * Street map (MapLibre GL). Markers are school locations; a user's point is
 * labelled as an approximate postcode centre. Polygons are only ever official
 * boundaries passed in by the server, each with its source note.
 */
export function SchoolMap({
  points,
  center,
  origin,
  polygons = [],
  height = 520,
  label = "Map of grammar schools",
  highlight,
  note = "School locations from GIAS (England) or postcode centres (Northern Ireland). The list gives the same schools for keyboard and screen reader use.",
  className,
}: {
  points: MapPoint[];
  center?: { lat: number; lng: number; zoom?: number };
  origin?: { lat: number; lng: number; label: string } | null;
  polygons?: MapPolygon[];
  height?: number | string;
  label?: string;
  highlight?: string | null;
  note?: string | null;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ref.current) return;
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !ref.current) return;
        maplibre.setWorkerUrl(`/map-worker.mjs?v=${maplibre.getVersion()}`);
        const map = new maplibre.Map({
          container: ref.current,
          style: STYLE,
          center: center ? [center.lng, center.lat] : [-2.5, 53.6],
          zoom: center?.zoom ?? 5.2,
          attributionControl: { compact: true },
          cooperativeGestures: true,
        });
        mapRef.current = map;
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        map.on("error", (e: { error?: { message?: string } }) => {
          if (String(e?.error?.message ?? "").includes("style")) setFailed(true);
        });
        map.on("load", () => {
          const green = token("--green-bright", "#23805a");
          const deep = token("--green", "#1c5040");
          const copper = token("--copper", "#b8773b");
          const card = token("--card", "#fffefa");
          polygons.forEach((p, i) => {
            map.addSource(`poly-${i}`, { type: "geojson", data: { type: "Feature", properties: { name: p.name }, geometry: p.geojson } });
            map.addLayer({ id: `poly-fill-${i}`, type: "fill", source: `poly-${i}`, paint: { "fill-color": green, "fill-opacity": 0.12 } });
            map.addLayer({ id: `poly-line-${i}`, type: "line", source: `poly-${i}`, paint: { "line-color": deep, "line-width": 2, "line-dasharray": [3, 1.5] } });
          });
          map.addSource("schools", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: points.map((p) => ({ type: "Feature", properties: { slug: p.slug, name: p.name, sub: p.sub ?? "" }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })),
            },
          });
          map.addLayer({
            id: "schools",
            type: "circle",
            source: "schools",
            paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4.5, 11, 8], "circle-color": green, "circle-stroke-width": 2, "circle-stroke-color": card },
          });
          map.addLayer({
            id: "schools-hl",
            type: "circle",
            source: "schools",
            filter: ["==", ["get", "slug"], ""],
            paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 8, 11, 12], "circle-color": copper, "circle-stroke-width": 3, "circle-stroke-color": card },
          });
          if (origin) {
            const el = document.createElement("div");
            el.className = "atlas-origin";
            el.setAttribute("aria-hidden", "true");
            new maplibre.Marker({ element: el })
              .setLngLat([origin.lng, origin.lat])
              .setPopup(new maplibre.Popup({ offset: 16 }).setHTML(`<strong>${esc(origin.label)}</strong><br/><span class="atlas-pop-sub">Approximate postcode centre — not your exact address</span>`))
              .addTo(map);
          }
          const popup = new maplibre.Popup({ closeButton: true, closeOnClick: true, offset: 10 });
          map.on("click", "schools", (e: { features?: { properties: unknown; geometry: unknown }[] }) => {
            const f = e.features?.[0];
            if (!f) return;
            const props = f.properties as { slug: string; name: string; sub: string };
            const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
            popup
              .setLngLat(coords)
              .setHTML(`<a href="/schools/${encodeURIComponent(props.slug)}" class="atlas-pop-link">${esc(props.name)}</a>${props.sub ? `<br/><span class="atlas-pop-sub">${esc(props.sub)}</span>` : ""}`)
              .addTo(map);
          });
          map.on("mouseenter", "schools", () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", "schools", () => (map.getCanvas().style.cursor = ""));
          if (!center && points.length > 1) {
            const lngs = points.map((p) => p.lng);
            const lats = points.map((p) => p.lat);
            map.fitBounds(
              [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)],
              ],
              { padding: 56, maxZoom: 11, duration: 0 },
            );
          } else if (!center && points.length === 1) {
            map.jumpTo({ center: [points[0]!.lng, points[0]!.lat], zoom: 11 });
          }
        });
      } catch {
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is initialised once per set of inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points.map((p) => p.slug)), origin?.lat, origin?.lng, polygons.length]);

  // Highlight follows the list without re-creating the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer?.("schools-hl")) return;
    map.setFilter("schools-hl", ["==", ["get", "slug"], highlight ?? ""]);
  }, [highlight]);

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-[8px] border border-rule bg-sage">
        {failed ? (
          <p className="p-6 text-ink-2">The map could not be loaded. The same schools are listed alongside.</p>
        ) : (
          <div ref={ref} role="region" aria-label={label} style={{ height }} className="w-full" />
        )}
      </div>
      {note ? <p className="mt-2 text-small text-ink-2">{note}</p> : null}
    </div>
  );
}

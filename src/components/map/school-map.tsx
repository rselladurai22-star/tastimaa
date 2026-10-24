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

/**
 * Interactive map (MapLibre GL). Markers are school locations. A user's point
 * is labelled as an approximate postcode centre. Polygons are only ever
 * official boundaries passed in by the server with their source note.
 */
export function SchoolMap({
  points,
  center,
  origin,
  polygons = [],
  height = 520,
  label = "Map of grammar schools",
}: {
  points: MapPoint[];
  center?: { lat: number; lng: number; zoom?: number };
  origin?: { lat: number; lng: number; label: string } | null;
  polygons?: MapPolygon[];
  height?: number;
  label?: string;
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
          const accent = getComputedStyle(document.documentElement).getPropertyValue("--series-1").trim() || "#1d6b9e";
          const surface = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "#ffffff";
          polygons.forEach((p, i) => {
            map.addSource(`poly-${i}`, { type: "geojson", data: { type: "Feature", properties: { name: p.name }, geometry: p.geojson } });
            map.addLayer({ id: `poly-fill-${i}`, type: "fill", source: `poly-${i}`, paint: { "fill-color": accent, "fill-opacity": 0.1 } });
            map.addLayer({ id: `poly-line-${i}`, type: "line", source: `poly-${i}`, paint: { "line-color": accent, "line-width": 2 } });
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
            paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 10, 7], "circle-color": accent, "circle-stroke-width": 2, "circle-stroke-color": surface },
          });
          if (origin) {
            new maplibre.Marker({ color: "#c4562a" })
              .setLngLat([origin.lng, origin.lat])
              .setPopup(new maplibre.Popup({ offset: 24 }).setHTML(`<strong>${esc(origin.label)}</strong><br/><span style="font-size:12px">Approximate postcode centre — not your exact address</span>`))
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
              .setHTML(`<a href="/schools/${encodeURIComponent(props.slug)}" style="font-weight:600;text-decoration:underline">${esc(props.name)}</a>${props.sub ? `<br/><span style="font-size:12px">${esc(props.sub)}</span>` : ""}`)
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
              { padding: 48, maxZoom: 11, duration: 0 },
            );
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

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
      {failed ? (
        <p className="p-6 text-sm text-ink-2">The map could not be loaded. The same schools are listed below.</p>
      ) : (
        <div ref={ref} role="region" aria-label={label} style={{ height }} className="w-full" />
      )}
      <p className="border-t border-line bg-surface px-3 py-2 text-xs text-ink-3">
        Markers show school locations from GIAS (England) or postcode centres (Northern Ireland). Use the list for keyboard and screen reader access.
      </p>
    </div>
  );
}

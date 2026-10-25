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

/** A small isometric school: white walls, a pitched roof in the given colour and a flag. */
function schoolIcon(roof: string, scale = 2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${30 * scale}" height="${34 * scale}" viewBox="0 0 30 34">
<ellipse cx="15" cy="30.5" rx="11" ry="3.2" fill="#0a0c10" opacity=".18"/>
<path d="M3 17 L15 23 L15 31 L3 25Z" fill="#ffffff" stroke="#c8cdd8" stroke-width=".6"/>
<path d="M15 23 L27 17 L27 25 L15 31Z" fill="#dfe3ec" stroke="#c8cdd8" stroke-width=".6"/>
<path d="M2 17.5 L9 9 L21 15 L15 23.5Z" fill="${roof}"/>
<path d="M9 9 L21 15 L28 17.5 L16 11.5Z" fill="${roof}" opacity=".72"/>
<path d="M15 23.5 L21 15 L28 17.5 L27 17 Z" fill="${roof}" opacity=".55"/>
<rect x="6.5" y="21" width="3" height="3.6" fill="#9fd6f5" transform="skewY(26.5)" transform-origin="6.5 21"/>
<line x1="20" y1="13.5" x2="20" y2="3" stroke="#3c4550" stroke-width="1"/>
<path d="M20 3 L25.5 4.6 L20 6.4Z" fill="${roof}"/>
</svg>`;
  const img = new Image(30 * scale, 34 * scale);
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return img.decode().then(() => img);
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
          // A tilted, turned view so streets and buildings read as an isometric drawing.
          pitch: 52,
          bearing: -18,
          maxPitch: 65,
          attributionControl: { compact: true },
          cooperativeGestures: true,
        });
        mapRef.current = map;
        map.addControl(new maplibre.NavigationControl({ showCompass: true, visualizePitch: true }), "top-right");
        map.on("error", (e: { error?: { message?: string } }) => {
          if (String(e?.error?.message ?? "").includes("style")) setFailed(true);
        });
        map.on("load", async () => {
          // Extrude buildings from the vector tiles where the style provides them.
          const style = map.getStyle();
          const vector = Object.entries(style.sources ?? {}).find(([, src]) => (src as { type?: string }).type === "vector")?.[0];
          const firstLabel = style.layers?.find((l) => l.type === "symbol")?.id;
          if (vector) {
            map.addLayer(
              {
                id: "buildings-3d",
                type: "fill-extrusion",
                source: vector,
                "source-layer": "building",
                minzoom: 13,
                paint: {
                  "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 6], 0, "#eef1f7", 40, "#d9dfeb"],
                  "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13, 0, 14.5, ["coalesce", ["get", "render_height"], 6]],
                  "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                  "fill-extrusion-opacity": 0.9,
                },
              },
              firstLabel,
            );
          }
          const green = token("--green-bright", "#4242fa");
          const deep = token("--green", "#4242fa");
          const copper = token("--copper", "#e60067");
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
              features: points.map((p) => ({ type: "Feature", properties: { slug: p.slug, name: p.name, sub: p.sub ?? "", lat: p.lat }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })),
            },
          });
          let icons = false;
          try {
            const [base, lit] = await Promise.all([schoolIcon(deep), schoolIcon(copper)]);
            if (!map.hasImage("iso-school")) map.addImage("iso-school", base, { pixelRatio: 2 });
            if (!map.hasImage("iso-school-hl")) map.addImage("iso-school-hl", lit, { pixelRatio: 2 });
            icons = true;
          } catch {
            // Fall back to plain dots below.
          }
          if (icons) {
            const size = ["interpolate", ["linear"], ["zoom"], 5, 0.55, 9, 0.8, 13, 1.1] as unknown as number;
            map.addLayer({ id: "schools", type: "symbol", source: "schools", layout: { "icon-image": "iso-school", "icon-size": size, "icon-anchor": "bottom", "icon-allow-overlap": true, "symbol-sort-key": ["-", 0, ["get", "lat"]] as unknown as number } });
            map.addLayer({ id: "schools-hl", type: "symbol", source: "schools", filter: ["==", ["get", "slug"], ""], layout: { "icon-image": "iso-school-hl", "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 13, 1.35] as unknown as number, "icon-anchor": "bottom", "icon-allow-overlap": true } });
          } else {
            map.addLayer({ id: "schools", type: "circle", source: "schools", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4.5, 11, 8], "circle-color": green, "circle-stroke-width": 2, "circle-stroke-color": card } });
            map.addLayer({ id: "schools-hl", type: "circle", source: "schools", filter: ["==", ["get", "slug"], ""], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 8, 11, 12], "circle-color": copper, "circle-stroke-width": 3, "circle-stroke-color": card } });
          }
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
          // Frame every school, plus the user's postcode centre when there is one.
          const frame = [...points.map((p) => [p.lng, p.lat] as const), ...(origin ? [[origin.lng, origin.lat] as const] : [])];
          if (!center && frame.length > 1) {
            const lngs = frame.map((p) => p[0]);
            const lats = frame.map((p) => p[1]);
            map.fitBounds(
              [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)],
              ],
              { padding: 56, maxZoom: 11, duration: 0 },
            );
          } else if (!center && frame.length === 1) {
            map.jumpTo({ center: [frame[0]![0], frame[0]![1]], zoom: 11 });
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

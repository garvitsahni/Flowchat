import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TEAL = "#D97757";
const MUTED = "#8C8A86";

export function TrajectoryMap({
  latitudes,
  longitudes,
  floatId,
}: {
  latitudes: number[];
  longitudes: number[];
  floatId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView(
      [latitudes[0] ?? 0, longitudes[0] ?? 0],
      6
    );

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    L.polyline(
      latitudes.map((lat, i) => [lat, longitudes[i]]),
      { color: TEAL, weight: 2, opacity: 0.85 }
    ).addTo(map);

    // Start marker (muted) → end marker (teal, with glow)
    L.circleMarker([latitudes[0], longitudes[0]], {
      radius: 4,
      color: MUTED,
      fillColor: MUTED,
      fillOpacity: 1,
    })
      .bindTooltip("start", { permanent: false, className: "float-map-tip" })
      .addTo(map);

    L.circleMarker([latitudes[latitudes.length - 1], longitudes[longitudes.length - 1]], {
      radius: 6,
      color: TEAL,
      fillColor: TEAL,
      fillOpacity: 1,
    })
      .bindTooltip("current", { permanent: false, className: "float-map-tip" })
      .addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitudes, longitudes]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-current-500/40 bg-abyss-900">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded bg-abyss-950/80 px-2 py-1 font-mono text-[13px] text-foam-50">
        float <span className="text-bio-400">{floatId}</span> · trajectory
      </div>
    </div>
  );
}
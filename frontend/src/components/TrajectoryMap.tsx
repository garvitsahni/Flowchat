import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const PRIMARY = "hsl(var(--primary))";
const MUTED = "hsl(var(--muted-foreground))";

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
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    const latlngs: [number, number][] = latitudes.map((lat, i) => [lat, longitudes[i]]);

    // Fit map bounds to trajectory with padding
    if (latlngs.length > 0) {
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    // Draw waypoints (skip start and end, draw every Nth point to avoid clutter)
    const step = Math.max(1, Math.floor(latlngs.length / 15));
    for (let i = step; i < latlngs.length - 1; i += step) {
      L.circleMarker(latlngs[i], {
        radius: 2,
        color: PRIMARY,
        fillColor: PRIMARY,
        fillOpacity: 0.5,
        stroke: false,
      }).addTo(map);
    }

    // Draw trajectory polyline
    const path = L.polyline(latlngs, { 
      color: PRIMARY, 
      weight: 2, 
      opacity: 0.85,
      className: "trajectory-path" 
    }).addTo(map);

    // Animate the path using CSS stroke-dashoffset hack
    const pathElement = path.getElement() as SVGElement | null;
    if (pathElement) {
      pathElement.style.animation = "chart-line-draw 2s ease-out forwards";
      // Ensure SVG path has a dasharray length equal to its total length
      // Leaflet doesn't make it easy to get exact length synchronously so we use a huge number
      pathElement.style.strokeDasharray = "10000";
      pathElement.style.strokeDashoffset = "10000";
    }

    // Start marker (muted) → current marker (primary, with soft pulsing glow ring)
    L.circleMarker(latlngs[0], {
      radius: 4,
      color: MUTED,
      fillColor: MUTED,
      fillOpacity: 1,
    })
      .bindTooltip("start", { permanent: false, className: "float-map-tip" })
      .addTo(map);

    L.circleMarker(latlngs[latlngs.length - 1], {
      radius: 12,
      color: PRIMARY,
      opacity: 0.4,
      fill: true,
      fillColor: PRIMARY,
      fillOpacity: 0.2,
      className: "sonar-pulse"
    }).addTo(map);

    L.circleMarker(latlngs[latlngs.length - 1], {
      radius: 5,
      color: PRIMARY,
      fillColor: PRIMARY,
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
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-card">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-md border border-border bg-background/80 px-2 py-1 font-mono text-[13px] text-foreground backdrop-blur">
        float <span className="text-primary">{floatId}</span> · trajectory
      </div>
    </div>
  );
}

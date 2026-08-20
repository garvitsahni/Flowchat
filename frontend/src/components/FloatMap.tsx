import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RegionMap } from "../types";

const PRIMARY = "hsl(var(--primary))";

export function FloatMap({
  map,
  region,
}: {
  map: RegionMap;
  region?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const mapInstance = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(mapInstance);

    const latlngs: [number, number][] = map.floats.map((f) => [
      f.latitude,
      f.longitude,
    ]);

    if (latlngs.length > 0) {
      mapInstance.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
    }

    map.floats.forEach((f) => {
      L.circleMarker([f.latitude, f.longitude], {
        radius: 5,
        color: PRIMARY,
        fillColor: PRIMARY,
        fillOpacity: 0.9,
        stroke: true,
        weight: 1,
        opacity: 0.6,
      })
        .bindTooltip(f.float_id, {
          permanent: false,
          className: "float-map-tip",
        })
        .addTo(mapInstance);
    });

    mapRef.current = mapInstance;
    return () => {
      mapInstance.remove();
      mapRef.current = null;
    };
  }, [map]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-card">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-md border border-border bg-background/80 px-2 py-1 font-mono text-[13px] text-foreground backdrop-blur">
        {region ? <span>{region} · </span> : null}
        <span className="text-primary">{map.floats.length}</span> float
        {map.floats.length === 1 ? "" : "s"} in scope
      </div>
    </div>
  );
}
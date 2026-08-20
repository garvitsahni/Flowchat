"use client";

import { useEffect, useRef, useState } from "react";

interface OceanHeatmapData {
  points: {
    lat: number;
    lon: number;
    temperature_c?: number;
    salinity_psu?: number;
    depth_m?: number;
  }[];
  primary_variable: "temperature_c" | "salinity_psu" | null;
  unit: string;
  label: string;
  region?: string;
  period?: string;
  stats?: {
    value: { min: number; max: number; mean: number; count: number } | null;
    count: number;
  };
  meta?: {
    bounds: {
      min_lat: number | null;
      max_lat: number | null;
      min_lon: number | null;
      max_lon: number | null;
    };
    color_scale: string;
  };
}

function getColor(value: number, min: number, max: number, isTemp: boolean): string {
  if (value === undefined || value === null) return "transparent";
  const ratio = max > min ? (value - min) / (max - min) : 0.5;
  if (isTemp) {
    const hue = (1 - ratio) * 240;
    return `hsl(${hue}, 80%, 50%)`;
  } else {
    const l = 90 - ratio * 50;
    return `hsl(210, 80%, ${l}%)`;
  }
}

function formatValue(value: number | undefined, unit: string): string {
  if (value === undefined || value === null) return "N/A";
  return `${value.toFixed(1)} ${unit}`;
}

function getInitialLat(data: OceanHeatmapData): number {
  const bounds = data.meta?.bounds;
  if (bounds?.min_lat != null && bounds?.max_lat != null) {
    return (bounds.min_lat + bounds.max_lat) / 2;
  }
  return 0;
}

function getInitialLon(data: OceanHeatmapData): number {
  const bounds = data.meta?.bounds;
  if (bounds?.min_lon != null && bounds?.max_lon != null) {
    return (bounds.min_lon + bounds.max_lon) / 2;
  }
  return 75;
}

function shouldFitBounds(data: OceanHeatmapData): boolean {
  const bounds = data.meta?.bounds;
  return bounds?.min_lat != null && bounds?.max_lat != null;
}

function getFitBounds(data: OceanHeatmapData): [[number, number], [number, number]] {
  const bounds = data.meta?.bounds!;
  return [
    [bounds.min_lat!, bounds.min_lon!],
    [bounds.max_lat!, bounds.max_lon!],
  ];
}

export function OceanHeatmapChart({ data }: { data: OceanHeatmapData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [layer, setLayer] = useState<any>(null);

  useEffect(() => {
    if (!containerRef.current || map) return;

    import("leaflet").then((L) => {
      import("leaflet.heat").catch(() => {
        // Fallback if heat plugin not available
      });

      const newMap = L.map(containerRef.current!, {
        center: [getInitialLat(data), getInitialLon(data)],
        zoom: 4,
        attributionControl: false,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 10,
      }).addTo(newMap);

      if (shouldFitBounds(data)) {
        newMap.fitBounds(getFitBounds(data), { padding: [20, 20] });
      }

      setMap(newMap);
    });
  }, [data]);

  useEffect(() => {
    if (!map || !data.points.length) return;

    import("leaflet").then((_L) => {
      import("leaflet.heat").then((Heat) => {
        const isTemp = data.primary_variable === "temperature_c";
        const minVal = data.stats?.value?.min ?? 0;
        const maxVal = data.stats?.value?.max ?? 1;

        const heatPoints = data.points
          .filter(p => p[data.primary_variable!] !== undefined && p[data.primary_variable!] !== null)
          .map(p => {
            const val = p[data.primary_variable!] as number;
            const intensity = (val - minVal) / (maxVal - minVal || 1);
            return [p.lat, p.lon, Math.max(0.1, intensity)];
          });

        if (layer) {
          map.removeLayer(layer);
        }

        const newLayer = (Heat as any).heatLayer(heatPoints, {
          radius: 25,
          blur: 15,
          maxZoom: 8,
          gradient: isTemp
            ? {
                0.0: "hsl(240, 80%, 50%)",
                0.25: "hsl(180, 80%, 50%)",
                0.5: "hsl(60, 80%, 50%)",
                0.75: "hsl(30, 80%, 50%)",
                1.0: "hsl(0, 80%, 50%)",
              }
            : {
                0.0: "hsl(210, 80%, 90%)",
                0.5: "hsl(210, 80%, 60%)",
                1.0: "hsl(210, 80%, 30%)",
              },
        }).addTo(map);

        setLayer(newLayer);
      }).catch(() => {
        // Fallback: render as circle markers
        const isTempFallback = data.primary_variable === "temperature_c";
        import("leaflet").then((L) => {
          if (layer) map.removeLayer(layer);
          const markers = L.layerGroup();
          data.points.forEach(p => {
            const val = p[data.primary_variable!];
            if (val !== undefined && val !== null) {
              const minValFb = data.stats?.value?.min ?? 0;
              const maxValFb = data.stats?.value?.max ?? 1;
              const color = getColor(val, minValFb, maxValFb, isTempFallback);
              L.circleMarker([p.lat, p.lon], {
                radius: 6,
                fillColor: color,
                color: "#111313",
                weight: 1,
                fillOpacity: 0.7,
              }).bindTooltip(`${data.label}: ${formatValue(val, data.unit)}`).addTo(markers);
            }
          });
          markers.addTo(map);
          setLayer(markers);
        });
      });
    });
  }, [map, data.points, data.primary_variable]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: "280px" }}
    />
  );
}

function StatBadge({ label, value, unit = "" }: { label: string; value: number | string | null; unit?: string }) {
  if (value === null || value === undefined) return null;
  return (
    <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
      <span className="text-foreground">{label}</span>
      <span className="font-semibold">{value}{unit}</span>
    </span>
  );
}

export function OceanHeatmapWrapper({ data }: { data: OceanHeatmapData }) {
  const stats = data.stats?.value;

  return (
    <div className="flex h-full min-h-[280px] flex-col border border-border bg-[#111313]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
          Ocean Heatmap · {data.label}
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          {data.region && <span className="font-mono text-xs text-muted-foreground">{data.region}</span>}
          {data.period && <span className="font-mono text-xs text-muted-foreground">{data.period}</span>}
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {data.stats?.count ?? data.points.length} points
          </span>
          {stats && (
            <>
              <StatBadge label="Mean" value={stats.mean?.toFixed(1)} unit={data.unit} />
              <StatBadge label="Min" value={stats.min?.toFixed(1)} unit={data.unit} />
              <StatBadge label="Max" value={stats.max?.toFixed(1)} unit={data.unit} />
            </>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1 p-2.5">
        <OceanHeatmapChart data={data} />
      </div>
    </div>
  );
}
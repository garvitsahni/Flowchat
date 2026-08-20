"""Chart data shaping — converts raw result rows into the chart_data contract field.

Frontend renders strictly from these shapes (Plotly for profiles/timeseries/comparison,
Leaflet for trajectories). Keep keys stable — the frontend lib/ in DESIGN.md §3 depends on them.
"""

from __future__ import annotations

from statistics import mean, stdev
from typing import Any

from .orchestrator.base import QueryResult


def _stats(values: list[float | None]) -> dict[str, float | None]:
    """Compute basic statistics, ignoring None values."""
    clean = [v for v in values if v is not None]
    if not clean:
        return {"min": None, "max": None, "mean": None, "std": None, "count": 0}
    return {
        "min": min(clean),
        "max": max(clean),
        "mean": mean(clean),
        "std": stdev(clean) if len(clean) > 1 else 0.0,
        "count": len(clean),
    }


def depth_profile(result: QueryResult) -> dict[str, Any]:
    rows = result.rows
    depths = [r.get("depth_m") for r in rows]
    temps = [r.get("temperature_c") for r in rows]
    sals = [r.get("salinity_psu") for r in rows]

    return {
        "type": "depth_profile",
        "depths_m": depths,
        "temperatures_c": temps,
        "salinities_psu": sals,
        "region": result.region,
        "period": result.period,
        "stats": {
            "temperature_c": _stats(temps),
            "salinity_psu": _stats(sals),
            "depth_m": _stats(depths),
        },
        "meta": {
            "y_axis": "Depth (m)",
            "x_axes": ["Temperature (°C)", "Salinity (PSU)"],
            "y_reversed": True,
        },
    }


def trajectory(result: QueryResult) -> dict[str, Any]:
    rows = result.rows
    lats = [r.get("latitude") for r in rows]
    lons = [r.get("longitude") for r in rows]
    dates = [str(r.get("profile_date"))[:10] for r in rows]

    return {
        "type": "trajectory",
        "latitudes": lats,
        "longitudes": lons,
        "dates": dates,
        "float_id": result.float_ids[0] if result.float_ids else "",
        "region": result.region,
        "period": result.period,
        "stats": {
            "lat": _stats(lats),
            "lon": _stats(lons),
        },
        "meta": {
            "bounds": {
                "min_lat": _stats(lats)["min"],
                "max_lat": _stats(lats)["max"],
                "min_lon": _stats(lons)["min"],
                "max_lon": _stats(lons)["max"],
            },
        },
    }


def time_series(result: QueryResult) -> dict[str, Any]:
    rows = result.rows
    key = "avg_temp" if rows and "avg_temp" in rows[0] else "avg_salinity"
    unit = "°C" if key == "avg_temp" else "PSU"
    label = "Temperature" if key == "avg_temp" else "Salinity"

    months = [str(r.get("month"))[:7] for r in rows]
    values = [r.get(key) for r in rows]

    # Compute trend line (simple linear regression)
    clean = [(i, v) for i, v in enumerate(values) if v is not None]
    trend = None
    if len(clean) >= 2:
        x_vals = [c[0] for c in clean]
        y_vals = [c[1] for c in clean]
        n = len(clean)
        x_mean = mean(x_vals)
        y_mean = mean(y_vals)
        slope = sum((x - x_mean) * (y - y_mean) for x, y in clean) / sum((x - x_mean) ** 2 for x in x_vals)
        intercept = y_mean - slope * x_mean
        trend = [intercept + slope * i for i in range(n)]

    return {
        "type": "time_series",
        "months": months,
        "values": values,
        "unit": unit,
        "label": label,
        "region": result.region,
        "period": result.period,
        "stats": {
            "value": _stats(values),
        },
        "trend": trend,
        "meta": {
            "x_axis": "Month",
            "y_axis": f"{label} ({unit})",
            "has_trend": trend is not None,
        },
    }


def comparison(result: QueryResult) -> dict[str, Any]:
    target = next((r.get("target_avg") for r in result.rows if "target_avg" in r), None)
    baseline = next((r.get("baseline_avg") for r in result.rows if "baseline_avg" in r), None)

    return {
        "type": "comparison",
        "target": target,
        "baseline": baseline,
        "delta": (target - baseline) if (target is not None and baseline is not None) else None,
        "region": result.region,
        "period": result.period,
        "stats": {
            "target": target,
            "baseline": baseline,
        },
        "meta": {
            "y_axis": "Temperature (°C)",
            "labels": ["Target Period", "Historical Baseline"],
        },
    }


def heatmap(result: QueryResult) -> dict[str, Any]:
    """Time-depth heatmap (existing)."""
    rows = result.rows
    has_temp = any(r.get("avg_temp") is not None for r in rows)
    key = "avg_temp" if has_temp else "avg_salinity"
    unit = "°C" if has_temp else "PSU"
    label = "Temperature" if has_temp else "Salinity"

    # Extract unique months and depth bins
    months = sorted(set(str(r.get("month"))[:7] for r in rows if r.get("month")))
    depth_bins = sorted(set(r.get("depth_bin") for r in rows if r.get("depth_bin") is not None))

    # Build grid
    grid = []
    for row in rows:
        if row.get("month") and row.get("depth_bin") is not None and row.get(key) is not None:
            grid.append({
                "month": str(row["month"])[:7],
                "depth_bin": row["depth_bin"],
                "value": row[key],
            })

    all_values = [g["value"] for g in grid]
    stats = _stats(all_values)

    return {
        "type": "heatmap",
        "subtype": "time_depth",
        "grid": grid,
        "months": months,
        "depth_bins": depth_bins,
        "unit": unit,
        "label": label,
        "region": result.region,
        "period": result.period,
        "stats": {
            "value": stats,
        },
        "meta": {
            "x_axis": "Month",
            "y_axis": "Depth (m)",
            "y_reversed": True,
            "color_scale": "viridis" if has_temp else "blues",
        },
    }


def ocean_heatmap(result: QueryResult) -> dict[str, Any]:
    """Geographic ocean heatmap — spatial distribution of measurements."""
    rows = result.rows

    points = []
    for r in rows:
        lat = r.get("latitude")
        lon = r.get("longitude")
        temp = r.get("temperature_c")
        sal = r.get("salinity_psu")
        depth = r.get("depth_m")
        if lat is not None and lon is not None:
            points.append({
                "lat": lat,
                "lon": lon,
                "temperature_c": temp,
                "salinity_psu": sal,
                "depth_m": depth,
            })

    # Determine primary variable
    has_temp = any(p["temperature_c"] is not None for p in points)
    has_sal = any(p["salinity_psu"] is not None for p in points)
    primary = "temperature_c" if has_temp else ("salinity_psu" if has_sal else None)
    unit = "°C" if primary == "temperature_c" else "PSU"
    label = "Temperature" if primary == "temperature_c" else "Salinity"

    values = [p[primary] for p in points if p[primary] is not None]
    stats = _stats(values)

    # Bounds for map viewport
    lats = [p["lat"] for p in points]
    lons = [p["lon"] for p in points]

    return {
        "type": "heatmap",
        "subtype": "ocean",
        "points": points,
        "primary_variable": primary,
        "unit": unit,
        "label": label,
        "region": result.region,
        "period": result.period,
        "stats": {
            "value": stats,
            "count": len(points),
        },
        "meta": {
            "bounds": {
                "min_lat": min(lats) if lats else None,
                "max_lat": max(lats) if lats else None,
                "min_lon": min(lons) if lons else None,
                "max_lon": max(lons) if lons else None,
            },
            "color_scale": "viridis" if primary == "temperature_c" else "blues",
        },
    }


def shape(result: QueryResult, chart_type: str) -> dict[str, Any]:
    if chart_type == "depth_profile":
        return depth_profile(result)
    if chart_type == "trajectory":
        return trajectory(result)
    if chart_type == "time_series":
        return time_series(result)
    if chart_type == "comparison":
        return comparison(result)
    if chart_type == "heatmap":
        # Detect subtype from data
        if result.rows and "depth_bin" in result.rows[0]:
            return heatmap(result)
        if result.rows and "latitude" in result.rows[0] and "longitude" in result.rows[0]:
            return ocean_heatmap(result)
        return heatmap(result)
    return {}
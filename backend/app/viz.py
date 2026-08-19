"""Chart data shaping — converts raw result rows into the chart_data contract field.

Frontend renders strictly from these shapes (Plotly for profiles/timeseries/comparison,
Leaflet for trajectories). Keep keys stable — the frontend lib/ in DESIGN.md §3 depends on them.
"""

from __future__ import annotations

from .orchestrator.base import QueryResult


def depth_profile(result: QueryResult) -> dict:
    rows = result.rows
    return {
        "type": "depth_profile",
        "depths_m": [r.get("depth_m") for r in rows],
        "temperatures_c": [r.get("temperature_c") for r in rows],
        "salinities_psu": [r.get("salinity_psu") for r in rows],
        "region": result.region,
        "period": result.period,
    }


def trajectory(result: QueryResult) -> dict:
    rows = result.rows
    return {
        "type": "trajectory",
        "latitudes": [r.get("latitude") for r in rows],
        "longitudes": [r.get("longitude") for r in rows],
        "dates": [str(r.get("profile_date"))[:10] for r in rows],
        "float_id": result.float_ids[0] if result.float_ids else "",
    }


def time_series(result: QueryResult) -> dict:
    rows = result.rows
    key = "avg_temp" if rows and "avg_temp" in rows[0] else "avg_salinity"
    unit = "°C" if key == "avg_temp" else "PSU"
    return {
        "type": "time_series",
        "months": [str(r.get("month"))[:7] for r in rows],
        "values": [r.get(key) for r in rows],
        "unit": unit,
        "region": result.region,
    }


def comparison(result: QueryResult) -> dict:
    target = next((r.get("target_avg") for r in result.rows if "target_avg" in r), None)
    baseline = next((r.get("baseline_avg") for r in result.rows if "baseline_avg" in r), None)
    return {
        "type": "comparison",
        "target": target,
        "baseline": baseline,
        "delta": (target - baseline) if (target is not None and baseline is not None) else None,
        "region": result.region,
        "period": result.period,
    }


def shape(result: QueryResult, chart_type: str) -> dict:
    if chart_type == "depth_profile":
        return depth_profile(result)
    if chart_type == "trajectory":
        return trajectory(result)
    if chart_type == "time_series":
        return time_series(result)
    if chart_type == "comparison":
        return comparison(result)
    return {}
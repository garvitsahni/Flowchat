"""Download real ARGO float NetCDF files from the Ifremer GDAC.

Fetches the three core files for a float ID from its DAC directory:
    {float_id}_prof.nc   — per-profile measurements
    {float_id}_meta.nc   — float metadata (deploy info, status)
    {float_id}_Rtraj.nc  — trajectory (surface positions)

Files land in data/netcdf/{float_id}/. Skips files already present unless --force.
Use the real ingested subset per AGENTS.md — never fabricate data for testing.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import httpx

GDAC_BASE = "https://data-argo.ifremer.fr"
REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data" / "netcdf"

FILES = ("prof", "meta", "Rtraj")


def download_float(float_id: str, dac: str = "incois", force: bool = False) -> list[Path]:
    """Download the NetCDF files for one float. Returns the list of saved paths."""
    out_dir = DATA_DIR / float_id
    out_dir.mkdir(parents=True, exist_ok=True)

    saved: list[Path] = []
    base_url = f"{GDAC_BASE}/dac/{dac}/{float_id}"
    with httpx.Client(timeout=120.0, follow_redirects=True) as client:
        for suffix in FILES:
            name = f"{float_id}_{suffix}.nc"
            dest = out_dir / name
            if dest.exists() and not force:
                print(f"skip (exists): {dest}")
                saved.append(dest)
                continue
            url = f"{base_url}/{name}"
            print(f"downloading: {url}")
            resp = client.get(url)
            resp.raise_for_status()
            dest.write_bytes(resp.content)
            print(f"saved: {dest} ({len(resp.content)} bytes)")
            saved.append(dest)
    return saved


def main() -> None:
    parser = argparse.ArgumentParser(description="Download ARGO float NetCDF files from Ifremer GDAC.")
    parser.add_argument("float_id", help="WMO float ID, e.g. 2900226")
    parser.add_argument("--dac", default="incois", help="DAC subdirectory on the GDAC (default: incois)")
    parser.add_argument("--force", action="store_true", help="Re-download even if the file exists")
    args = parser.parse_args()

    try:
        download_float(args.float_id, dac=args.dac, force=args.force)
    except httpx.HTTPStatusError as exc:
        print(f"error: HTTP {exc.response.status_code} for {exc.request.url}", file=sys.stderr)
        sys.exit(1)
    except httpx.HTTPError as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

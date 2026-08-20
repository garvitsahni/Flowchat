"""Tests for ingest_many.py — manifest parsing + driver logic.

Run from repo root with the pipeline import path:
    $env:PYTHONPATH="backend/app"; & "backend\.venv\Scripts\python.exe" backend\pipeline\test_ingest_many.py

The pipeline scripts do `from config import settings`, and `config.py` lives in
backend/app — so backend/app must be on PYTHONPATH (see the import note in the plan).
"""

import unittest
from pathlib import Path

from ingest_many import MANIFEST_PATH, load_manifest

REPO_ROOT = Path(__file__).resolve().parents[2]


class ManifestTests(unittest.TestCase):
    def test_manifest_exists(self):
        self.assertTrue(MANIFEST_PATH.exists(), f"manifest missing at {MANIFEST_PATH}")

    def test_manifest_header_and_columns(self):
        rows = load_manifest()
        self.assertGreaterEqual(len(rows), 15, f"expected >=15 floats, got {len(rows)}")
        for row in rows:
            self.assertEqual(set(row.keys()), {"float_id", "dac", "region"}, row)
            self.assertTrue(row["float_id"], row)
            self.assertTrue(row["dac"], row)
            self.assertIn(row["region"], {"Bay of Bengal", "Arabian Sea", "Andaman Sea"}, row)

    def test_manifest_has_all_regions(self):
        rows = load_manifest()
        regions = {r["region"] for r in rows}
        self.assertLessEqual({"Bay of Bengal", "Arabian Sea", "Andaman Sea"}, regions)

    def test_manifest_no_duplicate_floats(self):
        rows = load_manifest()
        ids = [r["float_id"] for r in rows]
        self.assertEqual(len(ids), len(set(ids)), "duplicate float_id in manifest")


if __name__ == "__main__":
    unittest.main()
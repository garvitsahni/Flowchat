import sys
sys.path.insert(0, "C:/Users/Garvi/Desktop/Projects/FloatChat/backend")

from app.main import _build_explanations


def test_build_explanations_contains_all_keys_en():
    floats = ["2900226", "2900227"]
    result = _build_explanations(floats, 123, "2023-01 to 2023-12", "en")
    assert set(result.keys()) >= {"floats_used", "readings", "qc_excluded", "usable", "calculation", "time_range", "sql"}
    assert "robotic ocean sensors" in result["floats_used"].lower()
    assert "single depth" in result["readings"].lower()
    assert "QC flag 4" in result["qc_excluded"]
    assert "passed quality checks" in result["usable"].lower()
    assert "mean (average)" in result["calculation"].lower()
    assert "data covers" in result["time_range"].lower()


def test_build_explanations_contains_all_keys_hi():
    floats = ["2900226"]
    result = _build_explanations(floats, 42, "2023", "hi")
    assert "readings" in result
    assert "usable" in result
    assert "calculation" in result
    assert result["readings"]
    assert result["usable"]
    assert result["calculation"]
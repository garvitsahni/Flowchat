import sys
import unittest

sys.path.insert(0, "C:/Users/Garvi/Desktop/Projects/FloatChat/backend")

from app.orchestrator.mock import MockProvider


class TestYearRange(unittest.TestCase):
    def test_year_range_ascii_hyphen(self):
        label, filt = MockProvider()._extract_period(
            "How did salinity change in the Arabian Sea over 2018-2020?"
        )
        self.assertEqual(label, "2018-2020")
        self.assertEqual(
            filt,
            "p.profile_date >= '2018-01-01' AND p.profile_date < '2021-01-01'",
        )

    def test_year_range_en_dash(self):
        label, filt = MockProvider()._extract_period(
            "How did salinity change in the Arabian Sea over 2018\u20132020?"
        )
        self.assertEqual(label, "2018-2020")
        self.assertIn("2018-01-01", filt)
        self.assertIn("2021-01-01", filt)

    def test_year_range_with_to(self):
        label, filt = MockProvider()._extract_period("salinity from 2018 to 2020")
        self.assertEqual(label, "2018-2020")
        self.assertIn("2018-01-01", filt)
        self.assertIn("2021-01-01", filt)

    def test_year_range_with_and(self):
        label, filt = MockProvider()._extract_period(
            "temperature between 2018 and 2020"
        )
        self.assertEqual(label, "2018-2020")
        self.assertIn("2018-01-01", filt)
        self.assertIn("2021-01-01", filt)

    def test_single_year_still_works(self):
        label, filt = MockProvider()._extract_period("temperature in 2019")
        self.assertEqual(label, "2019")
        self.assertIn("2019-01-01", filt)
        self.assertIn("2020-01-01", filt)

    def test_year_range_time_series_sql_uses_full_window(self):
        g = MockProvider().generate_sql(
            "How did salinity change in the Arabian Sea over 2018-2020?"
        )
        self.assertEqual(g.intent_type, "time_series")
        self.assertEqual(g.requested_period, "2018-2020")
        self.assertIn("'2018-01-01'", g.sql)
        self.assertIn("'2021-01-01'", g.sql)
        self.assertIn("avg_salinity", g.sql)


if __name__ == "__main__":
    unittest.main()
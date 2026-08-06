import unittest
from datetime import datetime, timedelta, timezone

from ml_models.contracts import ContractError
from ml_models.forecast_30m import FEATURE_COLUMNS, build_feature_row


def history(count=31, gap_at=None):
    start = datetime(2026, 8, 6, 2, 30, tzinfo=timezone.utc)
    rows = []
    for minute in range(count):
        offset = minute + (1 if gap_at is not None and minute >= gap_at else 0)
        rows.append(
            {
                "timestamp_utc": (start + timedelta(minutes=offset)).isoformat(),
                "temperature_c": 29 + minute / 100,
                "humidity_percent": 70,
                "voltage_v": 220,
                "current_a": 0.5 + minute / 100,
                "power_w": 100 + minute,
                "occupancy_count": 5,
            }
        )
    return rows


class ForecastFeatureTests(unittest.TestCase):
    def test_builds_exact_model_feature_contract(self):
        features = build_feature_row(history())
        self.assertEqual(list(features), FEATURE_COLUMNS)
        self.assertEqual(len(features), 44)
        self.assertEqual(features["power_w"], 130)
        self.assertEqual(features["power_lag_30"], 100)
        self.assertEqual(features["power_roll_mean_5"], 127)
        # 03:00 UTC is 10:00 Asia/Jakarta.
        self.assertEqual(features["hour"], 10)

    def test_requires_31_minutes(self):
        with self.assertRaises(ContractError):
            build_feature_row(history(30))

    def test_rejects_internal_time_gap(self):
        with self.assertRaises(ContractError):
            build_feature_row(history(gap_at=15))


if __name__ == "__main__":
    unittest.main()

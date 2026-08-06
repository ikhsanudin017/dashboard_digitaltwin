import unittest

from ml_models.services.prediction_service import predict_all


class PredictionServiceTests(unittest.TestCase):
    def test_composes_baseline_comfort_and_advisory_recommendation(self):
        result = predict_all(
            {
                "temperature_c": 29,
                "humidity_percent": 70,
                "occupancy_count": 5,
                "power_w": 120,
                "timestamp_utc": "2026-08-06T03:00:00Z",
            }
        )

        self.assertEqual(result["forecast_30m"]["status"], "baseline")
        self.assertEqual(result["forecast_30m"]["predicted_power_watt"], 120)
        self.assertEqual(result["forecast_30m"]["target_time"], "2026-08-06T03:30:00Z")
        self.assertTrue(result["comfort"]["is_estimate"])
        self.assertTrue(result["ac_recommendation"]["requires_user_approval"])
        self.assertIn(result["ac_recommendation"]["recommended_temp"], range(22, 27))
        self.assertEqual(len(result["ac_recommendation"]["scenarios"]), 5)

    def test_marks_forecast_unavailable_without_observed_power(self):
        result = predict_all(
            {
                "temperature_c": 27,
                "humidity_percent": 65,
                "timestamp_utc": "2026-08-06T03:00:00Z",
            }
        )
        self.assertEqual(result["power_estimation"]["status"], "unavailable")
        self.assertEqual(result["forecast_30m"]["status"], "unavailable")


if __name__ == "__main__":
    unittest.main()

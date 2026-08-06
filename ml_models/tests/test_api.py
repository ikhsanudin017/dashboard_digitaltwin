import unittest

from ml_models.api.app import create_app


class PredictionApiTests(unittest.TestCase):
    def setUp(self):
        self.client = create_app().test_client()

    def test_health(self):
        self.assertEqual(self.client.get("/api/health").status_code, 200)

    def test_predict_all_contract(self):
        response = self.client.post(
            "/api/predict/all",
            json={
                "suhu": 29,
                "kelembaban": 70,
                "daya": 120,
                "timestamp": "2026-08-06T03:00:00Z",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["forecast_30m"]["horizon_minutes"], 30)

    def test_invalid_payload_returns_400(self):
        response = self.client.post("/api/predict/all", json={"suhu": 29})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "invalid_telemetry")


if __name__ == "__main__":
    unittest.main()

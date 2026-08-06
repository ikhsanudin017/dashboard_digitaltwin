import unittest

from ml_models.contracts import ContractError, TelemetryInput


class TelemetryContractTests(unittest.TestCase):
    def test_accepts_legacy_indonesian_fields(self):
        telemetry = TelemetryInput.from_mapping(
            {
                "suhu": 28,
                "kelembaban": 70,
                "daya": 120,
                "jumlahOrang": 4,
                "timestamp": "2026-08-06T10:00:00+07:00",
            }
        )
        self.assertEqual(telemetry.temperature_c, 28)
        self.assertEqual(telemetry.power_w, 120)
        self.assertEqual(telemetry.occupancy_count, 4)
        self.assertEqual(telemetry.timestamp_utc.isoformat(), "2026-08-06T03:00:00+00:00")

    def test_rejects_missing_required_temperature(self):
        with self.assertRaises(ContractError):
            TelemetryInput.from_mapping({"kelembaban": 60})

    def test_rejects_out_of_range_humidity(self):
        with self.assertRaises(ContractError):
            TelemetryInput.from_mapping({"suhu": 25, "kelembaban": 120})

    def test_rejects_timestamp_without_timezone(self):
        with self.assertRaises(ContractError):
            TelemetryInput.from_mapping(
                {"suhu": 25, "kelembaban": 60, "timestamp": "2026-08-06T10:00:00"}
            )


if __name__ == "__main__":
    unittest.main()

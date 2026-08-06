"""30-minute forecast interface with an honest persistence baseline."""

from __future__ import annotations

from datetime import timedelta

from ml_models.contracts import TelemetryInput


def forecast_power_30m(telemetry: TelemetryInput) -> dict:
    if telemetry.power_w is None:
        return {
            "status": "unavailable",
            "reason": "power_w diperlukan sampai power estimator tervalidasi tersedia",
            "horizon_minutes": 30,
        }

    target_time = telemetry.timestamp_utc + timedelta(minutes=30)
    return {
        "status": "baseline",
        "method": "naive_persistence",
        "model_version": "persistence-30m:1",
        "horizon_minutes": 30,
        "predicted_power_watt": round(telemetry.power_w, 2),
        "generated_at": telemetry.timestamp_utc.isoformat().replace("+00:00", "Z"),
        "target_time": target_time.isoformat().replace("+00:00", "Z"),
        "confidence_percent": None,
        "note": "Baseline wajib; bukan model ML dan belum menyediakan prediction interval",
    }

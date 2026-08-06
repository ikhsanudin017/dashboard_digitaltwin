"""Application service composing ML and decision-support capabilities."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Mapping

from ml_models import SCHEMA_VERSION
from ml_models.comfort import calculate_comfort
from ml_models.contracts import TelemetryInput
from ml_models.forecast_30m import forecast_power_30m
from ml_models.power_estimator import estimate_current_power
from ml_models.recommendation import build_recommendation


def predict_all(sensor_data: Mapping[str, Any]) -> dict:
    telemetry = TelemetryInput.from_mapping(sensor_data)
    estimator = estimate_current_power(telemetry)
    forecast = forecast_power_30m(telemetry)
    comfort = calculate_comfort(telemetry)
    recommendation = build_recommendation(telemetry, forecast)

    return {
        "schema_version": SCHEMA_VERSION,
        "timestamp_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "input": telemetry.to_dict(),
        "power_estimation": estimator,
        "forecast_30m": forecast,
        "comfort": comfort,
        "ac_recommendation": recommendation,
        # Compatibility fields consumed by the current dashboard.
        "energy": {
            "predicted_watt": forecast.get("predicted_power_watt", telemetry.power_w or 0),
            "confidence": 0,
            "forecast_horizon_minutes": 30,
            "status": forecast["status"],
        },
        "ac": {
            "recommended_temp": recommendation["recommended_temp"],
            "action": recommendation["action"],
            "mode": recommendation["mode"],
            "confidence": 0,
            "requires_user_approval": True,
        },
    }


def predict_energy(sensor_data: Mapping[str, Any]) -> dict:
    telemetry = TelemetryInput.from_mapping(sensor_data)
    return forecast_power_30m(telemetry)


def predict_ac(sensor_data: Mapping[str, Any]) -> dict:
    telemetry = TelemetryInput.from_mapping(sensor_data)
    return build_recommendation(telemetry, forecast_power_30m(telemetry))


def model_info() -> dict:
    return {
        "schema_version": SCHEMA_VERSION,
        "deployment_mode": "azure_first",
        "power_estimator": {"status": "not_deployed"},
        "forecast_30m": {"status": "baseline", "version": "persistence-30m:1"},
        "comfort": {"status": "available", "version": "transparent_heuristic_v1"},
        "recommendation": {"status": "available", "version": "scenario_ranking_v1"},
    }


def reload_models() -> dict:
    # Azure ML owns model lifecycle; this local service has no mutable model cache.
    return model_info()

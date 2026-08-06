"""Transparent comfort estimate used until calibrated PMV inputs are available."""

from __future__ import annotations

from ml_models.contracts import TelemetryInput


def calculate_comfort(telemetry: TelemetryInput, *, setpoint_c: float | None = None) -> dict:
    effective_temp = telemetry.temperature_c if setpoint_c is None else float(setpoint_c)
    humidity_penalty = max(0.0, telemetry.humidity_percent - 60.0) * 0.08
    occupancy_penalty = max(0, telemetry.occupancy_count - 2) * 0.06
    thermal_deviation = abs(effective_temp - 24.0)
    score = max(0.0, min(100.0, 100.0 - thermal_deviation * 12.0 - humidity_penalty - occupancy_penalty))

    if score >= 80:
        level = "comfortable"
    elif effective_temp > 24:
        level = "warm"
    else:
        level = "cool"

    return {
        "method": "transparent_heuristic_v1",
        "is_estimate": True,
        "comfort_score": round(score, 1),
        "comfort_level": level,
        "assessed_temperature_c": round(effective_temp, 1),
        "limitations": [
            "Belum memakai kecepatan udara, metabolic rate, dan clothing insulation",
            "Bukan pengukuran PMV/PPD terkalibrasi",
        ],
    }

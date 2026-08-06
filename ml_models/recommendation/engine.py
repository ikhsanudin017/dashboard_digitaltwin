"""Human-in-the-loop AC scenario ranking."""

from __future__ import annotations

from ml_models.comfort import calculate_comfort
from ml_models.contracts import TelemetryInput


SETPOINTS_C = (22, 23, 24, 25, 26)


def _estimated_power_factor(setpoint_c: int, ambient_c: float) -> float:
    cooling_gap = max(0.0, ambient_c - setpoint_c)
    return 1.0 + cooling_gap * 0.035


def build_recommendation(telemetry: TelemetryInput, forecast: dict) -> dict:
    baseline_power = forecast.get("predicted_power_watt")
    scenarios = []

    for setpoint in SETPOINTS_C:
        comfort = calculate_comfort(telemetry, setpoint_c=setpoint)
        factor = _estimated_power_factor(setpoint, telemetry.temperature_c)
        projected_power = round(baseline_power * factor, 2) if baseline_power is not None else None
        energy_penalty = min(30.0, max(0.0, factor - 1.0) * 100.0)
        ranking_score = comfort["comfort_score"] - energy_penalty
        scenarios.append(
            {
                "setpoint_c": setpoint,
                "comfort_score": comfort["comfort_score"],
                "estimated_power_watt": projected_power,
                "ranking_score": round(ranking_score, 2),
            }
        )

    selected = max(scenarios, key=lambda item: item["ranking_score"])
    current = telemetry.temperature_c
    if selected["setpoint_c"] < current - 1:
        mode, action = "cooling", "Turunkan suhu AC"
    elif selected["setpoint_c"] > current + 1:
        mode, action = "eco", "Naikkan suhu AC"
    else:
        mode, action = "maintain", "Pertahankan suhu AC"

    return {
        "status": "advisory",
        "method": "scenario_ranking_v1",
        "recommended_temp": selected["setpoint_c"],
        "action": action,
        "mode": mode,
        "requires_user_approval": True,
        "confidence_percent": None,
        "reason": "Kompromi terbaik antara estimasi kenyamanan dan konsumsi daya",
        "selected_scenario": selected,
        "scenarios": scenarios,
        "limitations": [
            "Dampak setpoint terhadap daya masih berupa estimasi heuristik",
            "Penghematan belum boleh diklaim sebelum outcome aktual tersedia",
        ],
    }

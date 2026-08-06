"""Optional current-power estimator boundary.

The Colab pickle is deliberately not loaded here. A native XGBoost artifact must
first be registered, versioned, and deployed through Azure ML.
"""

from __future__ import annotations

from ml_models.contracts import TelemetryInput


def estimate_current_power(telemetry: TelemetryInput) -> dict:
    if telemetry.power_w is not None:
        return {
            "status": "observed",
            "source": "sensor",
            "power_watt": round(telemetry.power_w, 2),
            "model_version": None,
        }
    return {
        "status": "unavailable",
        "source": None,
        "power_watt": None,
        "model_version": None,
        "reason": "Azure ML power-estimator belum dikonfigurasi",
    }

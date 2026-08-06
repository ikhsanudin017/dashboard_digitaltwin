"""Azure ML managed-online-endpoint scoring entry point."""

from __future__ import annotations

import json
import os
from datetime import timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import pandas as pd
import xgboost as xgb

from ml_models.contracts import ContractError, TelemetryInput
from ml_models.forecast_30m import FEATURE_COLUMNS, build_feature_row

_forecast_model = None
_estimator_model = None


def init():
    global _forecast_model, _estimator_model
    model_root = Path(os.environ["AZUREML_MODEL_DIR"])
    forecast_path = model_root / "forecast_30m" / "xgb_power_forecast.json"
    estimator_path = model_root / "power_estimator" / "model_xgb_daya.json"

    _forecast_model = xgb.XGBRegressor()
    _forecast_model.load_model(forecast_path)
    if list(_forecast_model.get_booster().feature_names or []) != FEATURE_COLUMNS:
        raise RuntimeError("Feature contract forecast tidak cocok dengan artifact")

    _estimator_model = xgb.XGBRegressor()
    _estimator_model.load_model(estimator_path)


def _forecast(payload: dict[str, Any]) -> dict:
    features = build_feature_row(
        payload.get("history", []),
        room_timezone=payload.get("room_timezone", "Asia/Jakarta"),
    )
    frame = pd.DataFrame([features], columns=FEATURE_COLUMNS)
    prediction = max(0.0, float(_forecast_model.predict(frame)[0]))
    current = TelemetryInput.from_mapping(payload["history"][-1])
    return {
        "status": "predicted",
        "method": "xgboost",
        "model_name": "twinuvo-power-forecast-30m",
        "model_status": "candidate",
        "horizon_minutes": 30,
        "predicted_power_watt": round(prediction, 3),
        "generated_at": current.timestamp_utc.isoformat().replace("+00:00", "Z"),
        "target_time": (current.timestamp_utc + timedelta(minutes=30)).isoformat().replace("+00:00", "Z"),
        "confidence_percent": None,
    }


def _estimate(payload: dict[str, Any]) -> dict:
    telemetry = TelemetryInput.from_mapping(payload.get("telemetry"))
    local = telemetry.timestamp_utc.astimezone(ZoneInfo(payload.get("room_timezone", "Asia/Jakarta")))
    columns = [
        "Suhu (C)", "Kelembaban (%)", "Tegangan (V)", "Arus (A)",
        "Jumlah Orang", "Jam", "Menit", "HariDalamMinggu",
    ]
    if telemetry.voltage_v is None or telemetry.current_a is None:
        raise ContractError("Power estimator membutuhkan voltage_v dan current_a")
    values = [[
        telemetry.temperature_c, telemetry.humidity_percent, telemetry.voltage_v,
        telemetry.current_a, telemetry.occupancy_count, local.hour, local.minute,
        local.weekday(),
    ]]
    prediction = max(0.0, float(_estimator_model.predict(pd.DataFrame(values, columns=columns))[0]))
    return {
        "status": "estimated",
        "method": "xgboost",
        "model_name": "twinuvo-power-estimator",
        "model_status": "candidate",
        "estimated_power_watt": round(prediction, 3),
        "confidence_percent": None,
    }


def run(raw_data):
    try:
        payload = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
        operation = payload.get("operation", "forecast_30m")
        if operation == "forecast_30m":
            result = _forecast(payload)
        elif operation == "estimate_power":
            result = _estimate(payload)
        else:
            raise ContractError("operation harus forecast_30m atau estimate_power")
        return {"success": True, "result": result}
    except ContractError as exc:
        return {"success": False, "error": "invalid_input", "message": str(exc)}
    except Exception:
        return {"success": False, "error": "inference_failed"}

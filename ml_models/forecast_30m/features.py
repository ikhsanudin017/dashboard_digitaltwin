"""Canonical feature builder matching Training_Powe_Forecasting_ipnyb.ipynb."""

from __future__ import annotations

from datetime import timedelta
from math import cos, pi, sin
from statistics import mean, stdev
from typing import Any, Iterable, Mapping
from zoneinfo import ZoneInfo

from ml_models.contracts import ContractError, TelemetryInput

FEATURE_COLUMNS = [
    "temp_c", "humidity_pct", "voltage_v", "current_a", "power_w", "occupancy",
    "power_lag_1", "current_lag_1", "temp_lag_1", "occupancy_lag_1",
    "power_lag_5", "current_lag_5", "temp_lag_5", "occupancy_lag_5",
    "power_lag_15", "current_lag_15", "temp_lag_15", "occupancy_lag_15",
    "power_lag_30", "current_lag_30", "temp_lag_30", "occupancy_lag_30",
    "power_roll_mean_5", "power_roll_std_5", "power_roll_min_5", "power_roll_max_5",
    "occupancy_roll_mean_5", "power_roll_mean_15", "power_roll_std_15",
    "power_roll_min_15", "power_roll_max_15", "occupancy_roll_mean_15",
    "power_roll_mean_30", "power_roll_std_30", "power_roll_min_30",
    "power_roll_max_30", "occupancy_roll_mean_30", "hour", "dow", "is_weekend",
    "hour_sin", "hour_cos", "dow_sin", "dow_cos",
]

REQUIRED_NUMERIC = ("voltage_v", "current_a", "power_w")


def _validate_history(records: Iterable[Mapping[str, Any]]) -> list[TelemetryInput]:
    telemetry = sorted((TelemetryInput.from_mapping(item) for item in records), key=lambda item: item.timestamp_utc)
    if len(telemetry) < 31:
        raise ContractError("Forecast membutuhkan minimal 31 titik telemetry (t-30 sampai t)")
    telemetry = telemetry[-31:]

    for item in telemetry:
        for field in REQUIRED_NUMERIC:
            if getattr(item, field) is None:
                raise ContractError(f"Forecast membutuhkan field {field} pada seluruh history")

    for previous, current in zip(telemetry, telemetry[1:]):
        if current.timestamp_utc - previous.timestamp_utc != timedelta(minutes=1):
            raise ContractError("History forecast harus kontinu dengan interval tepat satu menit")
    return telemetry


def build_feature_row(
    records: Iterable[Mapping[str, Any]], *, room_timezone: str = "Asia/Jakarta"
) -> dict[str, float | int]:
    history = _validate_history(records)
    current = history[-1]
    row: dict[str, float | int] = {
        "temp_c": current.temperature_c,
        "humidity_pct": current.humidity_percent,
        "voltage_v": current.voltage_v,
        "current_a": current.current_a,
        "power_w": current.power_w,
        "occupancy": current.occupancy_count,
    }

    for lag in (1, 5, 15, 30):
        value = history[-1 - lag]
        row[f"power_lag_{lag}"] = value.power_w
        row[f"current_lag_{lag}"] = value.current_a
        row[f"temp_lag_{lag}"] = value.temperature_c
        row[f"occupancy_lag_{lag}"] = value.occupancy_count

    # Notebook uses shift(1), so rolling windows exclude the current minute.
    past = history[:-1]
    for window in (5, 15, 30):
        window_rows = past[-window:]
        powers = [item.power_w for item in window_rows]
        occupancies = [item.occupancy_count for item in window_rows]
        row[f"power_roll_mean_{window}"] = mean(powers)
        row[f"power_roll_std_{window}"] = stdev(powers)  # pandas rolling std uses ddof=1
        row[f"power_roll_min_{window}"] = min(powers)
        row[f"power_roll_max_{window}"] = max(powers)
        row[f"occupancy_roll_mean_{window}"] = mean(occupancies)

    try:
        local_time = current.timestamp_utc.astimezone(ZoneInfo(room_timezone))
    except Exception as exc:
        raise ContractError(f"Timezone ruangan tidak valid: {room_timezone}") from exc
    hour = local_time.hour
    dow = local_time.weekday()
    row.update(
        {
            "hour": hour,
            "dow": dow,
            "is_weekend": int(dow >= 5),
            "hour_sin": sin(2 * pi * hour / 24),
            "hour_cos": cos(2 * pi * hour / 24),
            "dow_sin": sin(2 * pi * dow / 7),
            "dow_cos": cos(2 * pi * dow / 7),
        }
    )
    return {name: row[name] for name in FEATURE_COLUMNS}

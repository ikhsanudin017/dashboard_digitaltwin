"""Versioned request contracts shared by inference components."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from math import isfinite
from typing import Any, Mapping


class ContractError(ValueError):
    """Raised when telemetry cannot safely be used for inference."""


def _number(data: Mapping[str, Any], names: tuple[str, ...], *, required: bool = True) -> float | None:
    value = next((data[name] for name in names if data.get(name) is not None), None)
    if value is None:
        if required:
            raise ContractError(f"Field wajib tidak ditemukan: {names[0]}")
        return None
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise ContractError(f"Field {names[0]} harus berupa angka") from exc
    if not isfinite(result):
        raise ContractError(f"Field {names[0]} harus berupa angka finite")
    return result


def _bounded(name: str, value: float | None, minimum: float, maximum: float) -> None:
    if value is not None and not minimum <= value <= maximum:
        raise ContractError(f"Field {name} di luar rentang {minimum}..{maximum}")


def _timestamp(value: Any) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if isinstance(value, datetime):
        parsed = value
    else:
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError as exc:
            raise ContractError("timestamp_utc harus berformat ISO-8601") from exc
    if parsed.tzinfo is None:
        raise ContractError("timestamp_utc harus menyertakan zona waktu")
    return parsed.astimezone(timezone.utc)


@dataclass(frozen=True)
class TelemetryInput:
    temperature_c: float
    humidity_percent: float
    occupancy_count: int
    timestamp_utc: datetime
    voltage_v: float | None = None
    current_a: float | None = None
    power_w: float | None = None
    room_id: str = "default-room"
    device_id: str = "unknown-device"

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any] | None) -> "TelemetryInput":
        if not isinstance(data, Mapping):
            raise ContractError("Payload telemetry harus berupa object JSON")

        temperature = _number(data, ("temperature_c", "suhu", "temperature"))
        humidity = _number(data, ("humidity_percent", "kelembaban", "humidity"))
        occupancy_raw = _number(
            data,
            ("occupancy_count", "jumlahOrang", "peopleCount", "people"),
            required=False,
        )
        voltage = _number(data, ("voltage_v", "tegangan", "voltage"), required=False)
        current = _number(data, ("current_a", "arus", "current"), required=False)
        power = _number(data, ("power_w", "daya", "power"), required=False)

        _bounded("temperature_c", temperature, -10, 60)
        _bounded("humidity_percent", humidity, 0, 100)
        _bounded("occupancy_count", occupancy_raw, 0, 10_000)
        _bounded("voltage_v", voltage, 0, 500)
        _bounded("current_a", current, 0, 1_000)
        _bounded("power_w", power, 0, 1_000_000)

        return cls(
            temperature_c=temperature,
            humidity_percent=humidity,
            occupancy_count=int(occupancy_raw or 0),
            timestamp_utc=_timestamp(data.get("timestamp_utc", data.get("timestamp"))),
            voltage_v=voltage,
            current_a=current,
            power_w=power,
            room_id=str(data.get("room_id") or data.get("roomId") or "default-room"),
            device_id=str(data.get("device_id") or data.get("deviceId") or "unknown-device"),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "temperature_c": self.temperature_c,
            "humidity_percent": self.humidity_percent,
            "occupancy_count": self.occupancy_count,
            "voltage_v": self.voltage_v,
            "current_a": self.current_a,
            "power_w": self.power_w,
            "timestamp_utc": self.timestamp_utc.isoformat().replace("+00:00", "Z"),
            "room_id": self.room_id,
            "device_id": self.device_id,
        }

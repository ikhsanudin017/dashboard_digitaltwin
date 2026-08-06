"""Generate a valid 31-minute request for endpoint smoke testing."""

import json
from datetime import datetime, timedelta, timezone

start = datetime(2026, 8, 6, 2, 30, tzinfo=timezone.utc)
history = []
for minute in range(31):
    history.append(
        {
            "timestamp_utc": (start + timedelta(minutes=minute)).isoformat().replace("+00:00", "Z"),
            "room_id": "room-01",
            "device_id": "esp32-01",
            "temperature_c": 29.0,
            "humidity_percent": 70.0,
            "voltage_v": 220.0,
            "current_a": 0.55,
            "power_w": 120.0,
            "occupancy_count": 5,
        }
    )

print(json.dumps({"operation": "forecast_30m", "room_timezone": "Asia/Jakarta", "history": history}, indent=2))

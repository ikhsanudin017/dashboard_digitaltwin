# ADR-004: MQTT untuk telemetry dan API untuk query/decision

## Status
Accepted

## Context
Telemetry bersifat event-stream, sedangkan dashboard query, scenario, dan keputusan pengguna memerlukan request/response serta authorization yang jelas.

## Decision
Gunakan MQTT sebagai transport utama device/edge telemetry dan HTTP API/WebSocket untuk query, state update ke UI, serta decision command. Adapter cloud dapat memakai Azure IoT Hub; local mode memakai broker lokal. Semua transport memetakan kontrak domain yang sama.

## Alternatives
HTTP-only; MQTT-only termasuk dashboard; vendor-specific contract end-to-end.

## Consequences
Offline buffering dan fan-out lebih natural, tetapi topic ACL, QoS, duplicate handling, API auth, dan dua adapter deployment perlu diuji.

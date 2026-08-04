# ADR-005: Pemrosesan kamera pada edge

## Status
Accepted

## Context
Occupancy berguna sebagai feature, tetapi frame penghuni bersifat sensitif dan cloud video meningkatkan risiko privasi serta bandwidth.

## Decision
Detection/tracking dilakukan pada Raspberry Pi. Data keluar hanya `occupancy`, `confidence`, `timestamp`, `roomId`, `deviceId`, device status, dan model version. Video/frame mentah tidak disimpan atau dikirim ke cloud; local stream default off atau terproteksi.

## Alternatives
Cloud vision; tanpa kamera; sensor non-visual.

## Consequences
Privasi dan bandwidth membaik, tetapi edge performance, accuracy, model update, access control, dan dua implementasi YOLO saat ini perlu diselesaikan.

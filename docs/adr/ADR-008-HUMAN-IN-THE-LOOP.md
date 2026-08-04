# ADR-008: Human-in-the-loop untuk keputusan operasional

## Status
Accepted

## Context
Forecast, anomaly, dan scenario memiliki ketidakpastian. Rekomendasi yang langsung menjadi kontrol dapat merusak kenyamanan atau keselamatan.

## Decision
Semua recommendation melewati status `generated`, `reviewed`, dan `accepted`/`rejected` sebelum tindakan pengguna. `executed` dan `verified` hanya dicatat setelah ada bukti tindakan/outcome. Sistem tidak mengasumsikan acceptance.

## Alternatives
Kontrol otomatis; notification-only tanpa feedback; approval sekali untuk semua tindakan.

## Consequences
Akuntabilitas dan trust meningkat serta feedback dapat dievaluasi. Dibutuhkan identity, audit event, expiry, UI review, dan persistence lifecycle.

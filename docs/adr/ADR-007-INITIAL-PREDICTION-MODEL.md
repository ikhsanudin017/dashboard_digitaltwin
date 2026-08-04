# ADR-007: Baseline-first untuk forecast awal

## Status
Accepted

## Context
Eksperimen saat ini memakai target same-row dan random split, sehingga tidak membuktikan forecast 30/60 menit. Jumlah/kualitas data aktual belum diketahui.

## Decision
Mulai dengan naive persistence dan Linear Regression, lalu bandingkan Random Forest serta XGBoost/LightGBM hanya bila data cukup. Gunakan time-based split, horizon eksplisit, dan evaluasi per horizon. Sequence model ditunda.

## Alternatives
Langsung memakai deep sequence model; mempertahankan random split; rule-only forecast.

## Consequences
Baseline lebih jujur dan reproducible. Hasil lama tidak boleh diklaim sebagai performa forecast; pipeline, model card, artifact hash, latency, size, dan data period wajib dicatat.

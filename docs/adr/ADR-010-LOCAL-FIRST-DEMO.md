# ADR-010: Local-first untuk demo kompetisi

## Status
Accepted

## Context
Internet dan cloud venue dapat tidak stabil, tetapi demo harus dapat diulang dan tetap menunjukkan vertical slice produk.

## Decision
Sediakan mode lokal berisi broker, ingestion/backend, database, dashboard, local assets, simulated telemetry, dan replay dataset deterministik. Cloud mode tetap didukung tetapi bukan dependency demo.

## Alternatives
Cloud-only; video rekaman dashboard; mock frontend tanpa pipeline.

## Consequences
Demo lebih resilient dan dapat dites E2E. Orchestration, asset licensing, seed/replay contract, one-command setup, health check, serta recovery runbook wajib dibuat.

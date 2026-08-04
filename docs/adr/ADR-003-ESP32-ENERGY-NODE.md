# ADR-003: ESP32 sebagai energy node

## Status
Accepted

## Context
Node memerlukan UART, Wi-Fi, pembacaan sensor lingkungan, buffering ringan, dan publish telemetry dengan konsumsi/biaya sesuai prototipe.

## Decision
Pertahankan ESP32 sebagai energy node dan refactor monolit secara bertahap menjadi reader, telemetry builder, transport, config, dan health modules.

## Alternatives
Raspberry Pi sebagai node tunggal; mikrokontroler lain; meter langsung ke cloud.

## Consequences
Investasi firmware yang ada dapat dipertahankan. RAM/flash, konektivitas, clock, retry, dan testability harus dikelola; source lama tidak di-rewrite sekaligus.

# ADR-014: Cloud dan local mode dengan domain contract yang sama

## Status
Accepted

## Context
Cloud menyediakan managed integration, sedangkan kompetisi memerlukan operasi tanpa internet. Dua implementasi domain terpisah akan drift.

## Decision
Gunakan satu set schema serta semantics Twin State/intelligence untuk kedua mode. Transport, identity, dan storage diwujudkan sebagai adapter. Mode dipilih melalui konfigurasi eksplisit, dan UI selalu menampilkan source/mode.

## Alternatives
Cloud-only; local-only; dua code path domain independen.

## Consequences
Portability dan testability meningkat. Contract test harus dijalankan terhadap kedua adapter dan configuration matrix perlu didokumentasikan.

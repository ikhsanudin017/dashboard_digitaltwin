# ADR-013: Satu ruangan sebagai proof of concept

## Status
Accepted

## Context
Hardware, data, dan waktu kompetisi terbatas. Memonitor seluruh rumah akan memperbesar risiko tanpa membuktikan correctness satu vertical slice.

## Decision
MVP hanya mengaktifkan satu ruangan yang digunakan rutin. Contract tetap memuat `buildingId`, `roomId`, dan `deviceId`; storage/state tidak boleh bergantung pada satu ID hardcoded.

## Alternatives
Whole-house MVP; ruang virtual tanpa hardware; multi-room simulasi sebagai klaim utama.

## Consequences
Testing dan storytelling lebih fokus. Multi-room tetap memerlukan tenancy, isolation, aggregation, dan load decisions baru sebelum ekspansi.

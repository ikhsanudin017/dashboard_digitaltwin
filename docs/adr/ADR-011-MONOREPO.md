# ADR-011: Pertahankan monorepo dan restrukturisasi bertahap

## Status
Accepted

## Context
Firmware, edge, cloud adapter, ML, dan dashboard berada pada satu repository dengan path legacy dan perubahan pengguna yang belum di-commit.

## Decision
Pertahankan monorepo untuk fase kompetisi. Modularisasi in-place lebih dulu; pindahkan file hanya bila manfaat, references, deployment, tests, dan migration map telah diverifikasi.

## Alternatives
Rewrite ke repository baru; split service segera; tidak merapikan struktur.

## Consequences
Perubahan lebih aman dan contract lintas service mudah disinkronkan. CI perlu path-aware dan repository besar perlu policy untuk vendor/cache/model artifacts.

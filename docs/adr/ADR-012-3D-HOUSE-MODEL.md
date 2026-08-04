# ADR-012: Model rumah 3D sebagai konteks spasial

## Status
Accepted

## Context
Objek awal berupa rumah 3D, tetapi hanya satu ruangan memiliki telemetry dan menjadi Digital Twin aktif.

## Decision
Pertahankan model rumah untuk konteks navigasi/spasial. Hanya mesh/zone yang dipetakan ke `roomId` aktif boleh memvisualisasikan Twin State. Bagian lain tidak diberi kesan termonitor.

## Alternatives
Model satu ruangan saja; mengklaim semua bagian rumah aktif; tanpa visualisasi 3D.

## Consequences
Nilai demonstrasi tetap kuat dan klaim produk jujur. Dibutuhkan mapping room-to-mesh, legend/source/quality state, optimasi asset, dan fallback 2D bila 3D gagal.

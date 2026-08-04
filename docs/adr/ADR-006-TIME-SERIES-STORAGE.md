# ADR-006: Interface penyimpanan time-series yang pluggable

## Status
Proposed

## Context
Repository memakai Azure Table Storage, sedangkan local mode memerlukan database lokal. Pemilihan produk database final belum memiliki benchmark, retention, atau volume yang terukur.

## Decision
Definisikan storage interface dan schema/partitioning time-series terlebih dahulu. Azure Table dapat menjadi adapter compatibility; backend lokal dipilih setelah spike. Raw, validated, derived state, dan audit event tidak dicampur tanpa type/version.

## Alternatives
Azure Table sebagai contract permanen; database time-series khusus; relational database tunggal.

## Consequences
Domain tidak terkunci vendor dan cloud/local dapat konsisten. Ada biaya adapter dan keputusan teknologi final ditunda sampai kebutuhan query/scale terukur.

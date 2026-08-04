# Product Backlog — Twinuvo AI

Prioritas: P0 kritis, P1 penting, P2 pengembangan berikutnya, P3 opsional. `Owner: UNASSIGNED` berarti repository belum menetapkan penanggung jawab; bukan berarti pekerjaan tanpa pemilik.

## P0

### P0-SEC-001 — Rotasi dan sanitasi credential

- **Deskripsi:** Inventaris, rotasi, sanitasi current tree, dan scan riwayat untuk seluruh secret yang terpapar.
- **Priority:** P0
- **Status:** `BLOCKED` — memerlukan akses pemilik layanan dan koordinasi deployment.
- **Owner:** UNASSIGNED
- **Dependencies:** Pemilik Azure, broker, map provider, Raspberry Pi, secret manager.
- **Acceptance Criteria:** Semua credential terpapar dirotasi; current-tree dan full-history scan terdokumentasi; aplikasi memakai secret manager/environment server-side.
- **Definition of Done:** Tidak ada secret nyata pada tracked/untracked source; bukti rotasi disimpan di luar repository; CI secret scan blocking.
- **Risks:** Downtime bila rotasi tidak terkoordinasi; history rewrite mengganggu clone/fork.
- **Estimated Effort:** 1–3 hari + koordinasi eksternal.
- **Related Files:** `docs/audit/SECURITY_AUDIT.md`, lokasi sensitif yang dicatat di sana.

### P0-SAFE-001 — Hilangkan kontrol otomatis dari build MVP

- **Deskripsi:** Isolasi/nonaktifkan jalur IR closed-loop dan cloud control dari firmware kompetisi; pertahankan histori melalui migration plan.
- **Priority:** P0
- **Status:** `PLANNED`
- **Owner:** UNASSIGNED
- **Dependencies:** Keputusan build profile, review firmware, hardware regression test.
- **Acceptance Criteria:** Tanpa persetujuan pengguna, tidak ada command kontrol fisik yang dikirim.
- **Definition of Done:** Build MVP measurement-only; test membuktikan recommendation tidak memicu actuator.
- **Risks:** Prototipe eksperimen IR dapat rusak bila dipisahkan tanpa profile.
- **Estimated Effort:** 1–2 hari.
- **Related Files:** `sensor iot/src/main.cpp`, ADR-009.

### P0-WEB-001 — Pulihkan frontend production build

- **Deskripsi:** Perbaiki empty `AdminDashboard.vue` atau route terkait dengan perubahan terkecil yang dapat diuji.
- **Priority:** P0
- **Status:** `BLOCKED`
- **Owner:** UNASSIGNED
- **Dependencies:** Konfirmasi perilaku admin yang dimaksud dari source/router.
- **Acceptance Criteria:** `npm run build` exit 0 dan route non-admin/admin memiliki smoke test.
- **Definition of Done:** Build serta unit test hijau tanpa menyembunyikan error.
- **Risks:** Mengubah auth flow yang sedang dikerjakan pengguna.
- **Estimated Effort:** 0.5–1 hari.
- **Related Files:** `view_virtual/src/components/AdminDashboard.vue`, router, auth composable.

### P0-DATA-001 — Telemetry schema v1 dan validator

- **Deskripsi:** Tetapkan JSON Schema canonical beserta adapter field Indonesia legacy.
- **Priority:** P0
- **Status:** `PLANNED`
- **Owner:** UNASSIGNED
- **Dependencies:** Units, ID convention, timestamp policy, quality enum.
- **Acceptance Criteria:** Schema memuat `schemaVersion`, `messageId`, `timestamp`, `deviceId`, `roomId`, units, electrical/environment/quality; invalid payload ditolak dengan aman.
- **Definition of Done:** Schema, examples valid/invalid, validator, firmware/backend/frontend contract tests lulus.
- **Risks:** Memutus consumer legacy tanpa dual-read adapter.
- **Estimated Effort:** 2–4 hari.
- **Related Files:** firmware payload, Azure Functions, frontend composables.

### P0-IOT-001 — Migrasi sensing listrik ke PZEM-004T V3.0

- **Deskripsi:** Implementasi pembacaan UART dengan PZEM004Tv30 tanpa menghapus sensor legacy sebelum HIL lulus.
- **Priority:** P0
- **Status:** `BLOCKED` — hardware/toolchain belum tersedia pada audit.
- **Owner:** UNASSIGNED
- **Dependencies:** PZEM, ESP32, personel wiring kompeten, PlatformIO, P0-DATA-001.
- **Acceptance Criteria:** Read enam besaran, failure/NaN/timeout ditandai quality; test terhadap alat referensi terdokumentasi.
- **Definition of Done:** Firmware build, unit test builder, HIL dan electrical safety checklist lulus.
- **Risks:** Bahaya listrik AC; konflik UART; perubahan payload.
- **Estimated Effort:** 3–6 hari + pengujian hardware.
- **Related Files:** `sensor iot/src/main.cpp`, `sensor iot/platformio.ini`.

### P0-TWIN-001 — Twin State minimum satu ruangan

- **Deskripsi:** Bentuk state canonical dari validated telemetry dan pisahkan raw/current/historical/derived data.
- **Priority:** P0
- **Status:** `PLANNED`
- **Owner:** UNASSIGNED
- **Dependencies:** P0-DATA-001, ingestion/store interface.
- **Acceptance Criteria:** Update deterministic per `roomId`; stale/out-of-order input tidak merusak current state.
- **Definition of Done:** Schema, engine, unit/integration test, API response, dan contoh state tersedia.
- **Risks:** Coupling dengan Azure Table legacy.
- **Estimated Effort:** 3–5 hari.
- **Related Files:** Azure Functions dan service baru yang akan diputuskan.

### P0-DEMO-001 — Local/offline deterministic demo

- **Deskripsi:** Sediakan broker, backend, database, dashboard, simulated telemetry, dan replay tanpa internet.
- **Priority:** P0
- **Status:** `PARTIALLY_IMPLEMENTED`
- **Owner:** UNASSIGNED
- **Dependencies:** P0-DATA-001, P0-TWIN-001, orchestration decision.
- **Acceptance Criteria:** Dengan `APP_MODE=local`, `DEMO_MODE=true`, `REPLAY_MODE=false`, alur 10 langkah demo dapat diulang.
- **Definition of Done:** One-command start, pinned dependencies, replay dataset, runbook, failure recovery, E2E test.
- **Risks:** Asset/font/map diam-diam bergantung internet.
- **Estimated Effort:** 4–8 hari.
- **Related Files:** `local_data/`, `local_tileserver.py`, dashboard config.

### P0-DOC-001 — Sinkronkan branding dan klaim secara aman

- **Deskripsi:** Ganti TwinSpace secara bertahap setelah dampak key/path/API/deployment dipetakan; koreksi klaim tanpa rewrite massal.
- **Priority:** P0
- **Status:** `PARTIALLY_IMPLEMENTED`
- **Owner:** UNASSIGNED
- **Dependencies:** Migration map, compatibility adapters, build hijau.
- **Acceptance Criteria:** UI/docs/metadata memakai Twinuvo AI; storage/session key legacy dimigrasikan; endpoint/topic tidak putus.
- **Definition of Done:** Branding inventory nol kecuali archive/compatibility yang diberi label; tests lulus.
- **Risks:** Logout/cache loss, URL/topic/deployment break.
- **Estimated Effort:** 2–4 hari.
- **Related Files:** [Migration Map](../audit/MIGRATION_MAP.md).

## P1

### P1-ML-001 — Forecast energi 30/60 menit yang tervalidasi

- **Deskripsi:** Pisahkan preparation, feature, training, evaluation, artifact, inference, dan monitoring.
- **Priority:** P1
- **Status:** `PARTIALLY_IMPLEMENTED`
- **Owner:** UNASSIGNED
- **Dependencies:** Dataset cukup, contract interval, P0-TWIN-001.
- **Acceptance Criteria:** Time-based split; naive persistence + minimal satu model; MAE/RMSE/MAPE atau sMAPE/R²/latency/size per horizon.
- **Definition of Done:** Reproducible pipeline, versioned artifact/hash, model card, inference contract/test.
- **Risks:** Data leakage dan klaim akurasi prematur.
- **Estimated Effort:** 5–10 hari setelah data cukup.
- **Related Files:** `ml_models/`.

### P1-ANOM-001 — Anomaly engine formal

- **Deskripsi:** Gabungkan safety rules, statistical threshold, forecast residual, dan optional Isolation Forest.
- **Priority:** P1
- **Status:** `PARTIALLY_IMPLEMENTED`
- **Owner:** UNASSIGNED
- **Dependencies:** Twin State, forecast opsional, baseline normal.
- **Acceptance Criteria:** Entity anomaly memiliki ID/type/severity/evidence/expected/actual/confidence/action/status.
- **Definition of Done:** Unit test normal, high load, spike, low PF, stale, missing, out-of-range, dan drift.
- **Risks:** False positive dan alert fatigue.
- **Estimated Effort:** 4–7 hari.
- **Related Files:** firmware TinyML rules dan frontend heuristic legacy.

### P1-DEC-001 — Scenario, decision, dan feedback lifecycle

- **Deskripsi:** Implementasi baseline-alternative comparison, recommendation approval, dan outcome.
- **Priority:** P1
- **Status:** `PLANNED`
- **Owner:** UNASSIGNED
- **Dependencies:** Twin State, forecast/anomaly, auth/audit log.
- **Acceptance Criteria:** Saving selalu berlabel estimasi; statuses generated→reviewed→accepted/rejected→executed→verified tercatat.
- **Definition of Done:** Contract, service, UI, persistence, test, dan explanation tersedia; tidak ada auto-control.
- **Risks:** Rekomendasi optimistis dan comfort harm.
- **Estimated Effort:** 6–10 hari.
- **Related Files:** recommendation implementations legacy.

### P1-SEC-002 — Backend access control dan privacy hardening

- **Deskripsi:** AuthN/AuthZ server-side, RBAC, rate limit, origin allowlist, audit log, camera metadata-only default.
- **Priority:** P1
- **Status:** `PLANNED`
- **Owner:** UNASSIGNED
- **Dependencies:** Identity decision, deployment architecture.
- **Acceptance Criteria:** Anonymous write/raw stream ditolak; role tests dan privacy test lulus.
- **Definition of Done:** Threat model controls terimplementasi dan diuji.
- **Risks:** Breaking change untuk frontend/edge lama.
- **Estimated Effort:** 4–8 hari.
- **Related Files:** Azure Functions, Firebase auth, edge camera services.

## P2

### P2-REPO-001 — Restrukturisasi monorepo bertahap

- **Deskripsi:** Modularisasi in-place lalu pindahkan service hanya setelah reference/deployment tests tersedia.
- **Priority:** P2
- **Status:** `PLANNED`
- **Owner:** UNASSIGNED
- **Dependencies:** Migration map, build/test hijau, canonical edge decision.
- **Acceptance Criteria:** Tidak ada path consumer yang putus; README tiap service tersedia.
- **Definition of Done:** Target structure tercapai melalui checkpoint kecil; file generated/vendor mengikuti policy.
- **Risks:** Deployment/import/path break dan konflik dengan perubahan pengguna.
- **Estimated Effort:** Bertahap 1–2 minggu.
- **Related Files:** seluruh repository; [Migration Map](../audit/MIGRATION_MAP.md).

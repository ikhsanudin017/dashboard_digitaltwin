# Dashboard Legacy Path

## Status

PARTIALLY_IMPLEMENTED

## Ringkasan

Folder `view_virtual/` berisi aplikasi dashboard Vue 3 untuk telemetry, grafik, autentikasi, rekomendasi eksperimental, serta visualisasi 3D/map. Path target yang direncanakan adalah `apps/dashboard/`, tetapi folder belum dipindahkan karena migration plan dan validasi deployment belum selesai.

## Tanggung Jawab

- Menampilkan telemetry aktual, cache, atau demo dengan sumber yang dapat dibedakan.
- Menampilkan grafik historis dan status sensor.
- Menampilkan model rumah 3D dan konteks peta.
- Menyediakan UI review rekomendasi; bukan mengeksekusi kontrol listrik.

## Bukan Tanggung Jawab

- Menyimpan secret, device key, connection string, atau MQTT password.
- Melakukan ingestion dan validasi backend.
- Mengendalikan AC, lampu, stopkontak, atau listrik AC.
- Mengklaim seluruh bangunan sebagai monitored Digital Twin.

## Struktur Folder

```text
view_virtual/
├── src/
│   ├── components/       # Komponen UI, chart, 3D, dan map
│   ├── composables/      # Telemetry, history, auth, dan prediction adapters
│   ├── lib/              # Konfigurasi aplikasi dan Firebase
│   └── router/           # Route dashboard
├── public/
│   ├── models/           # Model rumah dan texture yang aktif
│   └── cesium/           # Asset Cesium lokal; masih perlu audit bundling
├── config/               # Descriptor deployment tambahan
├── .env.example          # Template canonical tanpa secret
├── package.json
└── vite.config.js
```

## Input

- HTTP response dari Azure Functions/backend.
- Optional local ML API dan camera stream.
- Firebase web configuration.
- Model GLTF/FBX, texture, serta local Cesium assets.

## Output

- Single-page web application.
- Chart, sensor status, 3D visualization, dan recommendation review UI.
- Cache browser untuk fallback tertentu.

## Dependensi

Vue, Vite, Vitest, Chart.js, Babylon.js, Cesium, Leaflet, MapLibre, Firebase, Axios, dan dependency lain pada `package.json`. `node_modules/` adalah generated output dan tidak disimpan di Git.

## Konfigurasi

Salin `.env.example` menjadi `.env` untuk konfigurasi lokal. Semua `VITE_*` dapat dibaca pengguna browser; nilai tersebut tidak boleh dianggap secret. MQTT credential lama tidak lagi menjadi konfigurasi dashboard aktif.

## Cara Menjalankan

```powershell
npm ci
npm run dev
```

## Cara Menguji

```powershell
npm run test:run -- --pool=forks --maxWorkers=1
npm run build
```

Status audit 2026-08-03: unit/component test exit code 0 dengan 113 deklarasi test. Production build masih gagal karena `src/components/AdminDashboard.vue` kosong.

## Troubleshooting

- Jika dependency belum tersedia setelah cleanup, jalankan `npm ci`.
- Jika build gagal pada `AdminDashboard.vue`, jangan menghapus file tersebut; `App.vue` masih mengimpornya dan implementasinya perlu dipulihkan.
- Jika model 3D tidak tampil, verifikasi path `public/models/` dan network request browser.
- Jika data tidak tersedia, periksa mode/source label sebelum menganggap fallback sebagai telemetry aktual.

## Batasan

- Build production belum hijau.
- Cloud/backend dan 3D belum memiliki E2E test.
- Beberapa library visualisasi tumpang tindih dan belum aman dihapus tanpa bundle/reference test.
- Local-admin dan write-key compatibility paths tidak aman untuk production.

## Dokumentasi Terkait

- [Repository audit](../docs/audit/REPOSITORY_AUDIT.md)
- [Feature inventory](../docs/audit/FEATURE_INVENTORY.md)
- [System architecture](../docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Removal inventory](../docs/migration/REMOVAL_INVENTORY_2026-08-03.md)

## Pemilik atau Area Keahlian

- Frontend
- 3D/Web Visualization
- Authentication Integration

## Terakhir Diverifikasi

2026-08-03 pada commit baseline `ed4a22292b45423946a70f4472a1a989f31571eb`.
